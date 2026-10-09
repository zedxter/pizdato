import test from 'node:test';
import assert from 'node:assert/strict';
import {Budget,extractFeedLinks,newsResults,telegramFailure} from '../../evening/network.mjs';
test('budget counts redirects and yields before consuming reserved review capacity',async()=>{
 let calls=0;const b=new Budget({resolver:async()=>[{address:'8.8.8.8'}],fetcher:async()=>{calls++;return new Response('',{status:302,headers:{location:'https://example.test/next'}});}});
 await assert.rejects(b.request('https://example.test/start'),/redirect/i);assert.equal(calls,6);
 for(let i=0;i<30;i++)await b.operation(false);
 assert.throws(()=>b.reserve(),/checkpoint/i);
});
test('feeds expose article links without scripts or non-HTTPS navigation',()=>{
 assert.deepEqual(extractFeedLinks('<rss><item><link>https://example.test/story?a=1&amp;b=2</link></item><item><link>http://bad.test/</link></item></rss>'),['https://example.test/story?a=1&b=2']);
});
import {createServices} from '../../evening/network.mjs';
import {mkdtemp,rm,readFile,chmod,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {EditionStore,digest} from '../../evening/store.mjs';
test('discovered source goes straight to a draft and malformed writer output remains recoverable',async()=>{
 const root=await mkdtemp(join(tmpdir(),'delivery-network-'));
 try{
 const url='https://www.nasa.gov/test-source';let saved=0,models=0;
 const budget=new Budget({resolver:async()=>[{address:'8.8.8.8'}],fetcher:async u=>u.includes('openrouter')?(models++,new Response(JSON.stringify({choices:[{message:{content:'invalid draft JSON'}}]}),{headers:{'content-type':'application/json'}})):new Response('<meta property="og:image" content="https://www.nasa.gov/cover.jpg">'+('Evidence '.repeat(30)))});
 const e={day:'2026-10-09',candidates:{[url]:{url,covers:['https://www.nasa.gov/cover.jpg']}},searches:[],visited:[],reserve:[],abandoned:[],findings:['Remove unsupported first-observation claim']};
 const deps=createServices({store:new EditionStore(root),vault:root,budget,dryRun:true});
 await assert.rejects(deps.prepare({edition:e,history:[],checkpoint:async()=>{saved++;},now:new Date('2026-10-09T18:00Z')}));
 assert.equal(models,1);assert.equal(e.rawDraft,'invalid draft JSON');assert.ok(saved>0);assert.ok(e.findings.includes('Remove unsupported first-observation claim'));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('approved media is staged by content hash and sent by its verified copy URL',async()=>{
 const root=await mkdtemp(join(tmpdir(),'delivery-cover-'));const previous=[process.env.OPENROUTER_API_KEY,process.env.COMPOSIO_CONSUMER_KEY];process.env.OPENROUTER_API_KEY='fixture';process.env.COMPOSIO_CONSUMER_KEY='fixture';
 try{
 const bytes=Buffer.from('fixture image bytes');let sent,elapsed=0;
 const budget=new Budget({clock:()=>elapsed,resolver:async()=>[{address:'8.8.8.8'}],fetcher:async(u,o)=>{
  if(u.includes('connect.composio')){
   const req=JSON.parse(o.body);let payload={};
   if(req.method==='tools/call'){
    if(req.params.name==='COMPOSIO_SEARCH_TOOLS')payload={data:{session:{id:'test'},toolkit_connection_statuses:[{toolkit:'telegram',accounts:[{alias:'pizdato-net-channel',status:'ACTIVE'}]}]}};
    else {const t=req.params.arguments.tools[0];if(t.tool_slug==='TELEGRAM_GET_CHAT')elapsed=170000;
    if(t.tool_slug==='TELEGRAM_SEND_PHOTO')sent=t.arguments;payload={data:{results:[{response:{successful:true,data:{ok:true,result:t.tool_slug==='TELEGRAM_GET_CHAT'?{id:-1004350521393,username:'pizdato_net'}:{message_id:55,chat:{id:-1004350521393}}}}}]}};}
   }
   return new Response(JSON.stringify({result:{structuredContent:payload}}));
  }
  if(u.endsWith('/story'))return new Response('<meta property="og:image" content="https://example.com/cover.jpg">'+('source evidence '.repeat(25)));
  return new Response(bytes,{headers:{'content-type':'image/jpeg'}});
 }});
 const deps=createServices({store:new EditionStore(join(root,'state')),vault:root,budget,coverRoot:join(root,'public'),coverBase:'https://pizdato.net/channel-covers'});
 const d={source_url:'https://example.com/story',image_url:'https://example.com/cover.jpg',caption:'approved caption',supporting_urls:[]};
 const v=await deps.verify(d,{edition:{},checkpoint:async()=>{}});await deps.ready(v.media);await deps.send(d,v.media);
 assert.equal(sent.photo,`https://pizdato.net/channel-covers/${digest(bytes)}.jpg`);assert.deepEqual(await readFile(join(root,'public',`${digest(bytes)}.jpg`)),bytes);
 await chmod(join(root,'public',`${digest(bytes)}.jpg`),0o600);await deps.ready(v.media);assert.equal((await stat(join(root,'public',`${digest(bytes)}.jpg`))).mode&0o777,0o444);
 }finally{for(const [i,k] of ['OPENROUTER_API_KEY','COMPOSIO_CONSUMER_KEY'].entries()){if(previous[i]===undefined)delete process.env[k];else process.env[k]=previous[i];}await rm(root,{recursive:true,force:true});}
});
test('network deadline holds even when transport ignores abort signals',async()=>{
 const b=new Budget({networkTimeout:10,fetcher:async()=>new Promise(()=>{})});
 await assert.rejects(b.request('https://example.com/'),/deadline/);
});
test('removed saved primary source requests replacement rather than infinite unchanged retry',async()=>{
 const deps=createServices({store:new EditionStore('/tmp/unused-delivery-store'),vault:'/tmp/unused',dryRun:true,budget:new Budget({resolver:async()=>[{address:'8.8.8.8'}],fetcher:async()=>new Response('gone',{status:404})})});
 const url='https://example.com/gone',e={day:'2026-10-09',candidates:{[url]:{url,covers:['https://example.com/cover.jpg']}},searches:[],visited:[],reserve:[],abandoned:[],findings:[]};
 await assert.rejects(deps.prepare({edition:e,history:[],checkpoint:async()=>{},now:new Date('2026-10-09')}),err=>err.replace&&err.replaceSource===url);
});
test('known unused send budget is definite non-delivery',async()=>{
 let requests=0;const b=new Budget({fetcher:async()=>{requests++;return new Response('ok');}});b.calls=40;
 await assert.rejects(b.request('https://connect.composio.dev/mcp',{method:'POST'}),e=>e.code==='YIELD'&&e.definiteNonDelivery===true);assert.equal(requests,0);
});
test('drafting after a tool result uses a complete model conversation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'delivery-tool-flow-'));let calls=0;
 try{
 const b=new Budget({resolver:async()=>[{address:'8.8.8.8'}],fetcher:async(u,o)=>{
  if(u.includes('openrouter')){calls++;const r=JSON.parse(o.body);
   if(calls===1)return new Response(JSON.stringify({choices:[{message:{role:'assistant',tool_calls:[{id:'fetch1',type:'function',function:{name:'fetch_url',arguments:JSON.stringify({url:'https://example.com/story'})}}]}}]}));
   assert.ok(!r.messages.some(m=>m.tool_calls),'incomplete tool transcript must not reach structured writer');
   assert.doesNotMatch(r.messages[0].content,/MUST finish by calling complete_post/);
   assert.match(r.messages[0].content,/Return exactly one JSON object/);
   assert.equal(r.reasoning.enabled,false,'structured drafting must allocate output to the caption');
   assert.match(r.messages.at(-1).content,/Rewrite caption to 750 characters/);
   assert.deepEqual(r.response_format.json_schema.schema.required,['angle','hook','body','pizdato','huevo','huevo_first','wisdom_options','wisdom','source_url','image_url','supporting_urls']);
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({source_url:'https://example.com/story'})}}]}));
  }
  return new Response('<meta property="og:image" content="https://example.com/cover.jpg">'+('evidence '.repeat(50)));
 }});
 const e={day:'2026-10-09',searches:[],visited:[],reserve:[],abandoned:[],findings:[],blockers:[{category:'format',section:'body',quote:'',problem:'Rewrite caption to 750 characters',fix:'Shorten'}]};
 const d=await createServices({store:new EditionStore(root),vault:root,budget:b,dryRun:true}).prepare({edition:e,history:[],checkpoint:async()=>{},now:new Date('2026-10-09')});
 assert.equal(d.source_url,'https://example.com/story');assert.equal(calls,2);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('successful no-content dependency responses are valid',async()=>{
 const b=new Budget({fetcher:async()=>new Response(null,{status:204})});assert.equal((await b.request('https://example.com/')).status,204);
});
test('three irrelevant searches switch to a feed and produce a verified-source draft',async()=>{
 const root=await mkdtemp(join(tmpdir(),'delivery-fallback-'));let searches=0,feeds=0;
 try{
 const budget=new Budget({resolver:async()=>[{address:'8.8.8.8'}],fetcher:async(u,o)=>{
  if(u.includes('openrouter')){const req=JSON.parse(o.body);return new Response(JSON.stringify({choices:[{message:req.tools?{role:'assistant',tool_calls:[{id:`search${searches}`,type:'function',function:{name:'search_web',arguments:'{"query":"irrelevant query"}'}}]}:{content:JSON.stringify({source_url:'https://example.com/story'})}}]}));}
  if(u.includes('bing.com')){searches++;return new Response('<rss><item><title>Dictionary result, no usable article</title></item></rss>');}
  if(u.endsWith('/feed/')){feeds++;return new Response('<rss><item><link>https://example.com/story</link></item></rss>');}
  return new Response('<meta property="og:image" content="https://example.com/cover.jpg">'+('verified source evidence '.repeat(25)));
 }});
 const e={day:'2026-10-09',searches:[],visited:[],reserve:[],abandoned:[],findings:[]};
 const d=await createServices({store:new EditionStore(root),vault:root,budget,dryRun:true}).prepare({edition:e,history:[],checkpoint:async()=>{},now:new Date('2026-10-09')});
 assert.equal(searches,3);assert.equal(feeds,1);assert.equal(d.source_url,'https://example.com/story');assert.ok(e.candidates[d.source_url]);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('evening reviewers spend no tokens on optional reasoning and may use a separate editor model',async()=>{
 const messages=[{role:'system',content:'Independently review the candidate'},{role:'user',content:'Full candidate and original evidence'}];
 const expected={issues:[{category:'wisdom',quote:'Ближнее работает линзой',problem:'Predictable',fix:'Sharper turn'}]};
 const previous=process.env.PIZDATO_EDITOR_MODEL;
 const models=[];
 const budget=new Budget({fetcher:async(u,o)=>{
  const req=JSON.parse(o.body);assert.deepEqual(req.messages,messages);assert.equal(req.reasoning.enabled,false);models.push(req.model);
  assert.deepEqual(req.response_format.json_schema.schema.required,['issues']);assert.equal(req.temperature,0);
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(expected)}}]}));
 }});
 try{
  const deps=createServices({store:new EditionStore('/tmp/unused-review-store'),vault:'/tmp/unused',budget,dryRun:true});
  delete process.env.PIZDATO_EDITOR_MODEL;assert.deepEqual(JSON.parse((await deps.review(messages)).content),expected);
  process.env.PIZDATO_EDITOR_MODEL='example/editor-model';await deps.review(messages);
  assert.notEqual(models[0],'example/editor-model');assert.equal(models[1],'example/editor-model');
 }finally{if(previous===undefined)delete process.env.PIZDATO_EDITOR_MODEL;else process.env.PIZDATO_EDITOR_MODEL=previous;}
});
test('repair request names unlocked sections, every blocker, one-time suggestions and rejected wisdoms',async()=>{
 const root=await mkdtemp(join(tmpdir(),'delivery-repair-'));let request;
 try{
 const url='https://example.com/story';
 const budget=new Budget({resolver:async()=>[{address:'8.8.8.8'}],fetcher:async(u,o)=>{
  if(u.includes('openrouter')){request=JSON.parse(o.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({source_url:url})}}]}));}
  return new Response('<meta property="og:image" content="https://example.com/cover.jpg">'+('evidence '.repeat(50)));
 }});
 const draft={hook:'Хук.',body:['Первый абзац.','Второй абзац.'],pizdato:'хорошо.',huevo:'плохо.',wisdom:'Старая мудрость',source_url:url,image_url:'https://example.com/cover.jpg',caption:'rendered'};
 const e={day:'2026-10-09',searches:[],visited:[],reserve:[],abandoned:[],findings:[],draft,unlocked:['huevo','wisdom'],blockers:[{category:'grammar',quote:'плохо',problem:'Agreement',fix:'Fix'}],suggestions:[{category:'humor',quote:'хорошо',problem:'Flat',fix:'Sharper'}],flaggedWisdoms:['Старая мудрость']};
 await createServices({store:new EditionStore(root),vault:root,budget,dryRun:true}).prepare({edition:e,history:[],checkpoint:async()=>{},now:new Date('2026-10-09')});
 const task=request.messages.at(-1).content,context=JSON.parse(request.messages[1].content);
 assert.match(task,/REPAIR/);assert.match(task,/\["huevo","wisdom"\]/);assert.match(task,/Agreement/);assert.match(task,/single polishing pass/);assert.match(task,/"hook":"Хук\."/);
 assert.deepEqual(context.rejectedWisdoms,['Старая мудрость']);assert.equal(request.messages[0].content.includes('Пятница — свободный микрофон'),true);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('discovery cannot submit its own caption: complete_post only names an already fetched source',async()=>{
 const root=await mkdtemp(join(tmpdir(),'delivery-choose-'));let writes=0,turns=0;
 try{
 const budget=new Budget({resolver:async()=>[{address:'8.8.8.8'}],fetcher:async(u,o)=>{
  if(u.includes('openrouter')){const req=JSON.parse(o.body);
   if(!req.tools){writes++;return new Response(JSON.stringify({choices:[{message:{content:'{}'}}]}));}
   turns++;assert.deepEqual(req.tools.find(t=>t.function.name==='complete_post').function.parameters.required,['source_url']);
   if(turns>1)assert.match(JSON.stringify(req.messages.at(-1)),/invalid/);
   return new Response(JSON.stringify({choices:[{message:{role:'assistant',tool_calls:[{id:`c${turns}`,type:'function',function:{name:'complete_post',arguments:JSON.stringify({source_url:'https://example.com/never-fetched',caption:'Injected caption'})}}]}}]}));}
  throw new Error('No network expected');
 }});
 const e={day:'2026-10-09',searches:[],visited:[],reserve:[],abandoned:[],findings:[],candidates:{}};
 await assert.rejects(createServices({store:new EditionStore(root),vault:root,budget,dryRun:true}).prepare({edition:e,history:[],checkpoint:async()=>{},now:new Date('2026-10-09')}),/Checkpoint required/);
 assert.equal(writes,0,'an unfetched source never reaches the writer');assert.equal(turns,5);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('Telegram delivery through Composio gets a longer deadline than ordinary network reads',async()=>{
 const seen=[];
 const b=new Budget({networkTimeout:15000,fetcher:async(u,o)=>{seen.push(o.timeoutMs);return new Response('ok');}});
 const timers=[];const original=globalThis.setTimeout;globalThis.setTimeout=(fn,ms)=>{timers.push(ms);return original(fn,0x7fffffff>ms?1e9:ms);};
 try{await b.request('https://connect.composio.dev/mcp',{method:'POST',timeoutMs:90000});await b.request('https://example.com/');}
 finally{globalThis.setTimeout=original;}
 assert.equal(timers[0],90000);assert.equal(timers[1],15000);assert.deepEqual(seen,[undefined,undefined]);
});
test('preflight proves plain replies, strict JSON and tool calls for every configured model before a switch',async()=>{
 const previous={...process.env};process.env.OPENROUTER_API_KEY='fixture';process.env.COMPOSIO_CONSUMER_KEY='fixture';process.env.PIZDATO_EVENING_MODEL='writer/model';process.env.PIZDATO_EDITOR_MODEL='editor/model';
 const run=async toolsWork=>{const seen=[];
  const budget=new Budget({resolver:async()=>[{address:'8.8.8.8'}],fetcher:async(u,o)=>{
   if(u.includes('connect.composio')){const req=JSON.parse(o.body);let payload={};
    if(req.method==='tools/call'){if(req.params.name==='COMPOSIO_SEARCH_TOOLS')payload={data:{session:{id:'t'},toolkit_connection_statuses:[{toolkit:'telegram',accounts:[{alias:'pizdato-net-channel',status:'ACTIVE'}]}]}};
     else payload={data:{results:[{response:{successful:true,data:{ok:true,result:{id:-1004350521393,username:'pizdato_net'}}}}]}};}
    return new Response(JSON.stringify({result:{structuredContent:payload}}));}
   const req=JSON.parse(o.body);seen.push([req.model,req.response_format?'json':req.tools?'tools':'plain']);
   const name=req.response_format?.json_schema?.name;
   const message=name==='editorial_verdict'?{content:'{"issues":[]}'}:name==='defect_verification'?{content:'{"verdicts":[]}'}:req.response_format?{content:'{"ok":true}'}:req.tools?(toolsWork?{tool_calls:[{id:'1',type:'function',function:{name:'ping',arguments:'{"value":"pizdato"}'}}]}:{content:'pong'}):{content:'LLM_OK'};
   return new Response(JSON.stringify({model:req.model,choices:[{message}]}));
  }});
  await createServices({store:new EditionStore('/tmp/unused-preflight'),vault:'/tmp/unused',budget,dryRun:true}).check();return seen;};
 try{
  assert.deepEqual(await run(true),[['writer/model','plain'],['writer/model','json'],['editor/model','plain'],['editor/model','json'],['editor/model','json'],['editor/model','json'],['writer/model','tools']]);
  await assert.rejects(run(false),/tool call/i);
 }finally{for(const k of Object.keys(process.env))if(!(k in previous))delete process.env[k];Object.assign(process.env,previous);}
});
test('news search returns compact results with original article links unwrapped from Bing redirects',()=>{
 const rss=`<rss><channel><item><title>Capybara Samba still missing</title><link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;aid=&amp;tid=1&amp;url=https%3a%2f%2fwww.theguardian.com%2fuk%2fsamba&amp;c=1</link><description>Six months after the escape</description><pubDate>Fri, 09 Oct 2026 10:00:00 GMT</pubDate></item><item><title>Insecure</title><link>http://www.bing.com/news/apiclick.aspx?url=http%3a%2f%2fexample.com%2fx</link></item></channel></rss>`;
 assert.deepEqual(newsResults(rss),[{title:'Capybara Samba still missing',url:'https://www.theguardian.com/uk/samba',summary:'Six months after the escape',published:'Fri, 09 Oct 2026 10:00:00 GMT'}]);
});
test('discovery searches news and never re-drafts an abandoned or published source',async()=>{
 const root=await mkdtemp(join(tmpdir(),'delivery-news-'));const urls=[];let writes=0,turn=0;
 try{
 const budget=new Budget({resolver:async()=>[{address:'8.8.8.8'}],fetcher:async(u,o)=>{urls.push(u);
  if(u.includes('openrouter')){const req=JSON.parse(o.body);
   if(!req.tools){writes++;return new Response(JSON.stringify({choices:[{message:{content:'{}'}}]}));}
   turn++;const call=turn===1?{name:'search_web',arguments:JSON.stringify({query:'capybara escaped'})}:{name:'fetch_url',arguments:JSON.stringify({url:'https://example.com/abandoned'})};
   return new Response(JSON.stringify({choices:[{message:{role:'assistant',tool_calls:[{id:`c${turn}`,type:'function',function:call}]}}]}));}
  if(u.includes('bing.com/news/search'))return new Response('<rss><item><title>t</title><link>https://example.com/abandoned</link></item></rss>');
  throw new Error('No network expected: '+u);
 }});
 const e={day:'2026-10-09',searches:[],visited:[],reserve:[],abandoned:['https://example.com/abandoned'],findings:[],candidates:{}};
 await assert.rejects(createServices({store:new EditionStore(root),vault:root,budget,dryRun:true}).prepare({edition:e,history:[],checkpoint:async()=>{},now:new Date('2026-10-09')}));
 assert.ok(urls.some(u=>u.startsWith('https://www.bing.com/news/search?format=rss&q=')),urls.join(' '));assert.equal(writes,0);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('any unusable supporting URL becomes a repair finding instead of an endless retry',async()=>{
 const deps=createServices({store:new EditionStore('/tmp/unused-support'),vault:'/tmp/unused',dryRun:true,budget:new Budget({resolver:async(h)=>{if(h==='dead.example')throw Object.assign(new Error('ENOTFOUND'),{code:'ENOTFOUND'});return [{address:'8.8.8.8'}];},fetcher:async u=>u.endsWith('/cover.jpg')?new Response('img',{headers:{'content-type':'image/jpeg'}}):new Response('<meta property="og:image" content="https://example.com/cover.jpg">'+('evidence '.repeat(30)))})});
 await assert.rejects(deps.verify({source_url:'https://example.com/story',image_url:'https://example.com/cover.jpg',supporting_urls:['https://dead.example/a']},{edition:{},checkpoint:async()=>{}}),e=>/dead\.example/.test(e.repairIssue||''));
});
test('delivery needs room for the whole send path',()=>{
 let t=0;const b=new Budget({clock:()=>t});t=300000-100000;
 assert.throws(()=>b.reserve({delivery:true}),/Checkpoint/);t=300000-130000;assert.doesNotThrow(()=>b.reserve({delivery:true}));
 const deps=createServices({store:new EditionStore('/tmp/unused-send'),vault:'/tmp/unused',dryRun:true,budget:b});
 t=300000-80000;assert.equal(deps.canSend(),false);t=300000-95000;assert.equal(deps.canSend(),true);
});
test('Telegram rejections are classified: 400 replaces the story, 429 waits, 401/403 block, unknown stays uncertain',()=>{
 const fail=(code,extra={})=>telegramFailure({successful:false,data:{ok:false,error_code:code,...extra}});
 assert.ok(fail(400).definiteNonDelivery&&fail(400).replace);
 const limited=fail(429,{parameters:{retry_after:30}});assert.ok(limited.definiteNonDelivery&&!limited.replace);assert.equal(limited.retryAfterMs,30000);
 assert.ok(fail(403).blocked);
 assert.equal(telegramFailure({successful:true,data:{ok:true,result:{message_id:1}}}),null);
 assert.equal(telegramFailure({successful:false}).definiteNonDelivery,undefined);
});
