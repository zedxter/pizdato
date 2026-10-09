import test from 'node:test';
import assert from 'node:assert/strict';
import {Budget,extractFeedLinks} from '../../evening/network.mjs';
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
 const e={day:'2026-10-09',candidates:{[url]:{url,covers:['https://www.nasa.gov/cover.jpg']}},searches:[],visited:[],reserve:[],abandoned:[],findings:[]};
 const deps=createServices({store:new EditionStore(root),vault:root,budget,dryRun:true});
 await assert.rejects(deps.prepare({edition:e,history:[],checkpoint:async()=>{saved++;},now:new Date('2026-10-09T18:00Z')}));
 assert.equal(models,1);assert.equal(e.rawDraft,'invalid draft JSON');assert.ok(saved>0);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('approved media is staged by content hash and sent by its verified copy URL',async()=>{
 const root=await mkdtemp(join(tmpdir(),'delivery-cover-'));const previous=[process.env.OPENROUTER_API_KEY,process.env.COMPOSIO_CONSUMER_KEY];process.env.OPENROUTER_API_KEY='fixture';process.env.COMPOSIO_CONSUMER_KEY='fixture';
 try{
 const bytes=Buffer.from('fixture image bytes');let sent;
 const budget=new Budget({resolver:async()=>[{address:'8.8.8.8'}],fetcher:async(u,o)=>{
  if(u.includes('connect.composio')){
   const req=JSON.parse(o.body);let payload={};
   if(req.method==='tools/call'){
    if(req.params.name==='COMPOSIO_SEARCH_TOOLS')payload={data:{session:{id:'test'},toolkit_connection_statuses:[{toolkit:'telegram',accounts:[{alias:'pizdato-net-channel',status:'ACTIVE'}]}]}};
    else {const t=req.params.arguments.tools[0];if(t.tool_slug==='TELEGRAM_SEND_PHOTO')sent=t.arguments;payload={data:{results:[{response:{successful:true,data:{ok:true,result:t.tool_slug==='TELEGRAM_GET_CHAT'?{id:-1004350521393,username:'pizdato_net'}:{message_id:55,chat:{id:-1004350521393}}}}}]}};}
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
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({source_url:'https://example.com/story'})}}]}));
  }
  return new Response('<meta property="og:image" content="https://example.com/cover.jpg">'+('evidence '.repeat(50)));
 }});
 const e={day:'2026-10-09',searches:[],visited:[],reserve:[],abandoned:[],findings:[]};
 const d=await createServices({store:new EditionStore(root),vault:root,budget:b,dryRun:true}).prepare({edition:e,history:[],checkpoint:async()=>{},now:new Date('2026-10-09')});
 assert.equal(d.source_url,'https://example.com/story');assert.equal(calls,2);
 }finally{await rm(root,{recursive:true,force:true});}
});
