import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft, readOnlyCall, parseMcp } from '../agent.mjs';
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
 for(const k of ['PIZDATO_LLM_BASE_URL','PIZDATO_LLM_API_KEY','PIZDATO_LLM_DIALECT','NOUS_API_KEY','OPENROUTER_API_KEY','PIZDATO_EVENING_MODEL','PIZDATO_REASONING_EFFORT','PIZDATO_EDITOR_REASONING_EFFORT'])delete process.env[k];
 Object.assign(process.env,env);
 try{await chat([{role:'user',content:'hi'}],tools,{...options,model,fetcher:async(url,init)=>{request={url,headers:init.headers,body:JSON.parse(init.body)};return new Response(JSON.stringify({model,choices:[{message:{content:'{}'}}],usage:{total_tokens:1}}));}});}
 finally{for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);}
 return request;
}
const schema={type:'json_schema',json_schema:{name:'x',strict:true,schema:{type:'object'}}};
test('default provider stays OpenRouter with its routing extensions for DeepSeek',async()=>{
 const r=await captured({OPENROUTER_API_KEY:'or-key'},'deepseek/deepseek-v4.1-flash',{temperature:0,maxTokens:100,reasoning:{enabled:false,exclude:true},responseFormat:schema});
 assert.equal(r.url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(r.headers.Authorization,'Bearer or-key');
 assert.equal(r.body.temperature,0);assert.deepEqual(r.body.reasoning,{enabled:false,exclude:true});assert.deepEqual(r.body.provider,{require_parameters:true});assert.equal(r.body.max_tokens,100);
});
test('OpenAI reasoning models never receive temperature, which would make OpenRouter find no endpoint',async()=>{
 const r=await captured({OPENROUTER_API_KEY:'or-key'},'openai/gpt-6.1-sol',{temperature:0,reasoning:{enabled:false,exclude:true},responseFormat:schema});
 assert.equal('temperature' in r.body,false);assert.deepEqual(r.body.reasoning,{effort:'low',exclude:true});
});
test('an OpenAI-compatible endpoint such as Nous Portal gets only standard parameters and its own key',async()=>{
 const r=await captured({PIZDATO_LLM_BASE_URL:'https://inference-api.nousresearch.com/v1/',NOUS_API_KEY:'nous-key',OPENROUTER_API_KEY:'or-key'},'openai/gpt-6.1-sol',{temperature:0.7,maxTokens:900,reasoning:{effort:'low',exclude:true},responseFormat:schema},[{type:'function',function:{name:'ping',parameters:{type:'object',properties:{}}}}]);
 assert.equal(r.url,'https://inference-api.nousresearch.com/v1/chat/completions');assert.equal(r.headers.Authorization,'Bearer nous-key');
 for(const k of ['reasoning','provider','temperature','max_tokens'])assert.equal(k in r.body,false,k);
 assert.equal(r.body.reasoning_effort,'low');assert.equal(r.body.max_completion_tokens,900);assert.deepEqual(r.body.response_format,schema);assert.equal(r.body.tools[0].function.name,'ping');
 assert.equal(llmConfig({PIZDATO_LLM_BASE_URL:'https://inference-api.nousresearch.com/v1',NOUS_API_KEY:'k'}).dialect,'openai');
});
test('keys are bound to their hosts and a missing credential is reported before any request',()=>{
 assert.equal(llmConfig({}).key,undefined);assert.equal(llmConfig({PIZDATO_LLM_API_KEY:'x',OPENROUTER_API_KEY:'y'}).key,'x');
 assert.equal(llmConfig({PIZDATO_LLM_BASE_URL:'https://inference-api.nousresearch.com/v1',OPENROUTER_API_KEY:'or'}).key,undefined,'the OpenRouter key never goes to Nous');
 assert.equal(llmConfig({PIZDATO_LLM_BASE_URL:'https://api.example.com/v1',NOUS_API_KEY:'nous',OPENROUTER_API_KEY:'or'}).key,undefined,'other hosts need an explicit key');
 assert.equal(llmConfig({PIZDATO_LLM_BASE_URL:'https://api.example.com/v1',PIZDATO_LLM_API_KEY:'own'}).key,'own');
 assert.throws(()=>llmConfig({PIZDATO_LLM_BASE_URL:'http://inference-api.nousresearch.com/v1',NOUS_API_KEY:'k'}),/https/);
});
test('reasoning effort for OpenAI reasoning models is configurable separately for writers and reviewers',async()=>{
 const nous={PIZDATO_LLM_BASE_URL:'https://inference-api.nousresearch.com/v1',NOUS_API_KEY:'k',PIZDATO_REASONING_EFFORT:'medium',PIZDATO_EDITOR_REASONING_EFFORT:'high'};
 assert.equal((await captured(nous,'openai/gpt-6.1-sol',{title:'pizdato-evening'})).body.reasoning_effort,'medium');
 for(const title of ['pizdato-editor','pizdato-proofreader','pizdato-verifier'])assert.equal((await captured(nous,'openai/gpt-6.1-sol',{title})).body.reasoning_effort,'high',title);
 assert.deepEqual((await captured({OPENROUTER_API_KEY:'k',PIZDATO_EDITOR_REASONING_EFFORT:'high'},'openai/gpt-6.1-sol',{title:'pizdato-verifier'})).body.reasoning,{effort:'high',exclude:true});
 assert.equal((await captured({...nous,PIZDATO_REASONING_EFFORT:'extreme',PIZDATO_EDITOR_REASONING_EFFORT:''},'openai/gpt-6.1-sol',{title:'pizdato-editor'})).body.reasoning_effort,'low','unknown values fall back to low');
 assert.deepEqual((await captured({OPENROUTER_API_KEY:'k',PIZDATO_EDITOR_REASONING_EFFORT:'high'},'deepseek/deepseek-v4.1-flash',{title:'pizdato-editor',reasoning:{enabled:false,exclude:true}})).body.reasoning,{enabled:false,exclude:true},'DeepSeek keeps reasoning disabled');
});
