import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft, readOnlyCall, parseMcp, endpointHost } from '../agent.mjs';
const wisdom='Пиздато жить там где даже маленькие странности каждый день становятся большими историями';
const caption=`Дядя Миша увидел смешную историю.\n\nПиздато: улыбнулся. Хуёво: кофе остыл.\n\nМудрость дня: «${wisdom}».\n\nМир ждёт твоего голоса: https://pizdato.net`;
test('accepts polished copy with exact CTA and wisdom',()=>assert.doesNotThrow(()=>validateDraft({caption,wisdom,source_url:'https://example.com/story'})));
test('rejects oversized copy, missing CTA and short wisdom',()=>{
 assert.throws(()=>validateDraft({caption:'x'.repeat(951),wisdom,source_url:'https://example.com'}));
 assert.throws(()=>validateDraft({caption:caption.replace('Мир ждёт','Нас ждёт'),wisdom,source_url:'https://example.com'}));
 assert.throws(()=>validateDraft({caption,wisdom:'Всего два',source_url:'https://example.com'}));
});
test('agent cannot send through MCP even with mixed batch',()=>{
 assert.equal(readOnlyCall('COMPOSIO_MULTI_EXECUTE_TOOL',{tools:[{tool_slug:'TELEGRAM_GET_CHAT'}]}),true);
 assert.equal(readOnlyCall('COMPOSIO_MULTI_EXECUTE_TOOL',{tools:[{tool_slug:'TELEGRAM_GET_CHAT'},{tool_slug:'TELEGRAM_SEND_PHOTO'}]}),false);
 assert.equal(readOnlyCall('COMPOSIO_REMOTE_BASH_TOOL',{}),false);
});
test('parses JSON and SSE MCP replies',()=>{
 const result={jsonrpc:'2.0',id:1,result:{tools:[]}};
 assert.deepEqual(parseMcp(JSON.stringify(result)),result);
 assert.deepEqual(parseMcp(`event: message\ndata: ${JSON.stringify(result)}\n\n`),result);
});
test('rejects a receipt for another chat or an unconfirmed send', async()=>{
 const { confirmedReceipt } = await import('../agent.mjs');
 assert.throws(()=>confirmedReceipt({successful:true,data:{ok:true,result:{message_id:159,chat:{id:123}}}}));
 assert.throws(()=>confirmedReceipt({successful:false,data:{ok:false}}));
 assert.equal(confirmedReceipt({successful:true,data:{ok:true,result:{message_id:159,chat:{id:-1004350521393}}}}).message_id,159);
});
test('extracts source cover URLs with attribute reordering and HTML entities', async()=>{
 const { extractCovers } = await import('../agent.mjs');
 assert.deepEqual(extractCovers('<meta content="/photo.jpg?a=1&amp;b=2" property="og:image"><meta name="twitter:image" content="https://cdn.example.com/cover.png">','https://example.com/story'), ['https://example.com/photo.jpg?a=1&b=2','https://cdn.example.com/cover.png']);
});
test('word-count rejection tells the reviser the measured count',()=>{
 assert.throws(()=>validateDraft({caption,wisdom:'Всего два',source_url:'https://example.com'}),/received 2 words/);
});
test('caption rejection reports length and gives the reviser a safe target',()=>{
 assert.throws(()=>validateDraft({caption:'x'.repeat(951),wisdom,source_url:'https://example.com'}),/received 951 characters.*750–850/);
});
import {chat,llmConfig} from '../agent.mjs';
async function captured(env,model,options={},tools){
 const saved={...process.env};let request;
 for(const k of ['PIZDATO_LLM_BASE_URL','PIZDATO_LLM_API_KEY','PIZDATO_LLM_DIALECT','NOUS_API_KEY','OPENROUTER_API_KEY','PIZDATO_EVENING_MODEL','PIZDATO_MORNING_MODEL','PIZDATO_REASONING_EFFORT','PIZDATO_EDITOR_REASONING_EFFORT'])delete process.env[k];
 Object.assign(process.env,env);
 try{await chat([{role:'user',content:'hi'}],tools,{...options,model,fetcher:async(url,init)=>{request={url,headers:init.headers,body:JSON.parse(init.body)};return new Response(JSON.stringify({model,choices:[{message:{content:'{}'}}],usage:{total_tokens:1}}));}});}
 finally{for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);}
 return request;
}
const schema={type:'json_schema',json_schema:{name:'x',strict:true,schema:{type:'object'}}};
const NOUS='https://inference-api.nousresearch.com/v1/chat/completions';
const OPENROUTER_ONLY=['reasoning','provider','max_tokens'];
test('the default provider is Nous Portal with its own key, standard parameters and no OpenRouter headers',async()=>{
 const r=await captured({NOUS_API_KEY:'nous-key',OPENROUTER_API_KEY:'or-key'},'openai/gpt-6.1-sol',{temperature:0.7,maxTokens:900,reasoning:{enabled:false,exclude:true},responseFormat:schema},[{type:'function',function:{name:'ping',parameters:{type:'object',properties:{}}}}]);
 assert.equal(r.url,NOUS);assert.equal(r.headers.Authorization,'Bearer nous-key');
 assert.equal('HTTP-Referer' in r.headers,false);assert.equal('X-Title' in r.headers,false);
 for(const k of [...OPENROUTER_ONLY,'temperature'])assert.equal(k in r.body,false,k);
 assert.equal(r.body.reasoning_effort,'low');assert.equal(r.body.max_completion_tokens,900);assert.deepEqual(r.body.response_format,schema);assert.equal(r.body.tools[0].function.name,'ping');
});
test('the default model is gpt-6.1-sol',async()=>{
 assert.equal((await captured({NOUS_API_KEY:'k'},undefined)).body.model,'openai/gpt-6.1-sol');
});
test('non-reasoning models get temperature and no effort; OpenRouter-only options never reach the body',async()=>{
 const r=await captured({NOUS_API_KEY:'k',PIZDATO_EDITOR_REASONING_EFFORT:'high'},'mistralai/mistral-large-4-0',{title:'pizdato-editor',temperature:0,maxTokens:100,reasoning:{enabled:false,exclude:true},responseFormat:schema});
 assert.equal(r.body.temperature,0);assert.equal('reasoning_effort' in r.body,false);assert.equal(r.body.max_completion_tokens,100);
 for(const k of OPENROUTER_ONLY)assert.equal(k in r.body,false,k);
});
for(const [model,reasons] of [['openai/gpt-6.1-sol',true],['gpt-5',true],['openai/o3',true],['gpt-4o',false],['gpt-10',false],['mistralai/mistral-large-4-0',false]])
 test(`model ${model} is ${reasons?'':'not '}treated as a reasoning model`,async()=>{
  const r=await captured({NOUS_API_KEY:'k'},model,{temperature:0.3});
  assert.equal('reasoning_effort' in r.body,reasons);assert.equal('temperature' in r.body,!reasons);
 });
test('keys are bound to their hosts and a missing credential is reported before any request',()=>{
 assert.equal(llmConfig({}).key,undefined);assert.equal(llmConfig({OPENROUTER_API_KEY:'or'}).key,undefined,'an OpenRouter key never enables inference');
 assert.equal(llmConfig({NOUS_API_KEY:'nous'}).key,'nous');
 assert.equal(llmConfig({PIZDATO_LLM_API_KEY:'x',NOUS_API_KEY:'y'}).key,'x','an explicit key takes precedence on Nous');
 assert.equal(llmConfig({PIZDATO_LLM_BASE_URL:'https://api.example.com/v1',NOUS_API_KEY:'nous'}).key,undefined,'other hosts need an explicit key');
 assert.equal(llmConfig({PIZDATO_LLM_BASE_URL:'https://evilnousresearch.com/v1',NOUS_API_KEY:'nous'}).key,undefined,'look-alike hosts get no Nous key');
 assert.equal(llmConfig({PIZDATO_LLM_BASE_URL:'https://api.example.com/v1',PIZDATO_LLM_API_KEY:'own'}).key,'own');
 assert.throws(()=>llmConfig({PIZDATO_LLM_BASE_URL:'http://inference-api.nousresearch.com/v1',NOUS_API_KEY:'k'}),/https/);
 assert.equal('dialect' in llmConfig({NOUS_API_KEY:'k'}),false);
});
test('an OpenRouter endpoint is refused before any request, even with an explicit key',()=>{
 for(const base of ['https://openrouter.ai/api/v1','https://eu.openrouter.ai/api/v1','https://openrouter.ai./api/v1','https://OpenRouter.AI/api/v1'])
  assert.throws(()=>llmConfig({PIZDATO_LLM_BASE_URL:base,PIZDATO_LLM_API_KEY:'k'}),/OpenRouter/,base);
 assert.doesNotThrow(()=>llmConfig({PIZDATO_LLM_BASE_URL:'https://evilopenrouter.ai/v1',PIZDATO_LLM_API_KEY:'k'}));
});
test('reasoning effort for OpenAI reasoning models is configurable separately for writers and reviewers',async()=>{
 const nous={NOUS_API_KEY:'k',PIZDATO_REASONING_EFFORT:'medium',PIZDATO_EDITOR_REASONING_EFFORT:'high'};
 assert.equal((await captured(nous,'openai/gpt-6.1-sol',{title:'pizdato-evening'})).body.reasoning_effort,'medium');
 for(const title of ['pizdato-editor','pizdato-proofreader','pizdato-verifier'])assert.equal((await captured(nous,'openai/gpt-6.1-sol',{title,reasoning:{enabled:false,exclude:true}})).body.reasoning_effort,'high',title);
 assert.equal((await captured({...nous,PIZDATO_REASONING_EFFORT:'extreme',PIZDATO_EDITOR_REASONING_EFFORT:''},'openai/gpt-6.1-sol',{title:'pizdato-editor'})).body.reasoning_effort,'low','unknown values fall back to low');
});
test('preflight lines name the endpoint host they verified, never a key or path',()=>{
 assert.equal(endpointHost(llmConfig({NOUS_API_KEY:'k'})),'inference-api.nousresearch.com');
 assert.equal(endpointHost(llmConfig({PIZDATO_LLM_BASE_URL:'https://api.example.com/v1',PIZDATO_LLM_API_KEY:'k'})),'api.example.com');
});
