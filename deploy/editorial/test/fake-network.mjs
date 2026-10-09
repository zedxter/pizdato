// External HTTP boundary only: run real hosts, real rendering and real editorial gate.
import {appendFile} from 'node:fs/promises';
const channel={id:-1004350521393,username:'pizdato_net'};
let generations=0,reviews=0,submissions=0,storyNumber=1;
const scenario=process.env.TEST_VERDICT;
const advanced=['budget-success','budget-exhaust','structural','invalid-first','source-swap','invalid-caption-swap','retired-source'].includes(scenario);
const json=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
const verdict=(pass,replace,problem)=>JSON.stringify({issues:pass?[]:[{category:replace?'repetition':'grammar',quote:'',problem,fix:'Repair the defect or choose another subject'}]});
const fixture={wisdom:'Если долго искать свободное время, его обязательно займут поиски свободного времени.',wish:'Дня, в котором найдётся место для маленькой приятной глупости.'};
const final={wisdom:'Самый короткий список покупок обычно получается сразу после возвращения из магазина.',wish:'Пусть сегодня всё нужное обнаружится в ближайшем ящике.'};
const caption=w=>`Дядя Миша оценил находку. Пиздато: вещь пригодилась. Хуёво: пришлось искать.\nМудрость дня: «${w}»\nМир ждёт твоего голоса: https://pizdato.net`;
globalThis.fetch=async(url,opts={})=>{
 if(String(url).includes('openrouter.ai')) {
 const req=JSON.parse(opts.body);
 if((req.reasoning?.effort!=='low'&&req.reasoning?.enabled!==false)||req.tools?.some(t=>t.function.name==='read_context')) throw new Error('Use bounded reasoning and supply full history exactly once');
 if(req.messages[0].content.startsWith('# Russian proofreading')) return json({choices:[{message:{content:JSON.stringify({issues:[]})}}]});
 if(req.messages[0].content.startsWith('# Defect verification')) return json({choices:[{message:{content:JSON.stringify({verdicts:JSON.parse(req.messages[1].content).claims.map(c=>({id:c.id,real:true,category:c.category,ground:'confirmed',reason:'confirmed'}))})}}]});
 if(req.messages[0].content.startsWith('# Public message editorial review')) {
 if(req.reasoning?.enabled!==false||req.response_format?.json_schema?.strict!==true) throw new Error('Editor must not spend tokens on optional reasoning and needs a strict output schema');
 reviews++;
 await appendFile(process.env.TEST_TRACE,`REVIEW ${reviews}\n`);
 if(process.env.TEST_VERDICT==='timeout') throw new Error('editor timeout');
 if(process.env.TEST_VERDICT==='malformed') return json({choices:[{message:{content:'{}'}}]});
 if(advanced) {
   const pass=scenario==='budget-success'?reviews===9:scenario==='invalid-caption-swap'?true:scenario==='source-swap'?reviews===2:scenario==='invalid-first';
   const replace=scenario==='retired-source';
   const reviewData=JSON.parse(req.messages[1].content);
   await appendFile(process.env.TEST_TRACE,`EVIDENCE ${JSON.stringify({source:reviewData.source,current:reviewData.current})}\n`);
   return json({choices:[{message:{content:verdict(pass,replace,replace?'Already published subject':'Agreement needs repair')}}]});
 }
 const pass=['approve','supporting'].includes(process.env.TEST_VERDICT)||(['repair','repair-twice','late-repair','stalled-repair'].includes(process.env.TEST_VERDICT)&&reviews===(process.env.TEST_VERDICT==='repair-twice'?3:2))||(process.env.TEST_VERDICT?.endsWith('replace')&&reviews===2);
 if(process.env.TEST_VERDICT==='supporting'&&!JSON.parse(req.messages[1].content).source.supporting?.some(s=>s.url==='https://source.test/supporting')) throw new Error('Editor did not receive supporting evidence');
 return json({choices:[{message:{content:verdict(pass,process.env.TEST_VERDICT?.endsWith('replace'),'Choose another subject.')}}]});
 }
 generations++;
 if(advanced) {
   const feedback=req.messages.at(-1)?.content||'';
   if(feedback.includes('DIFFERENT')) storyNumber++;
   submissions++;
   await appendFile(process.env.TEST_TRACE,`SUBMISSION ${submissions}\n`);
   const invalid=scenario==='structural'||(scenario==='invalid-first'&&submissions===1);
   const wisdom=submissions===1?fixture.wisdom:final.wisdom;
   if(!req.tools) return json({choices:[{message:{role:'assistant',content:invalid?'invalid JSON':JSON.stringify({wisdom,wish:final.wish})}}]});
   const source=scenario==='retired-source'?'https://source.test/story-1':['source-swap','invalid-caption-swap'].includes(scenario)&&submissions===2?'https://source.test/unauthorized':`https://source.test/story-${storyNumber}`;
   const args={caption:caption(wisdom),wisdom,source_url:invalid?'https://source.test/not-fetched':source,image_url:'https://source.test/cover.jpg',category:'Golden archive'};
   if(scenario==='invalid-caption-swap'&&submissions===1) args.caption='Invalid caption';
   const calls=[['fetch_url',{url:source}],['validate_cover',{url:'https://source.test/cover.jpg'}],['complete_post',args]];
   return json({choices:[{message:{role:'assistant',tool_calls:calls.map(([name,args],i)=>({id:`advanced${generations}-${i}`,type:'function',function:{name,arguments:JSON.stringify(args)}}))}}]});
 }

 if(scenario==='late-repair'&&generations<=28) return json({choices:[{message:{role:'assistant',content:'Still researching.'}}]});
 if(['repair','repair-twice','late-repair','stalled-repair'].includes(process.env.TEST_VERDICT)) {
   const repairTurn=generations-(scenario==='late-repair'?28:0);
   if(scenario==='stalled-repair'&&reviews) {
     await appendFile(process.env.TEST_TRACE,'STALLED_REPAIR_TURN\n');
     return json({choices:[{message:{role:'assistant',content:'Still thinking.'}}]});
   }
   if(reviews && !JSON.stringify(req.messages.at(-1)).includes('Repair')) throw new Error('Expected a repair instruction, not replacement');
   const original='Старый будильник зазвонила раньше обычного, и дядя Миша решил сразу встать.';
   const corrected=original.replace('зазвонила','зазвонил');
   const wisdom=reviews?corrected:original;
   if(!req.tools) return json({choices:[{message:{role:'assistant',content:JSON.stringify({wisdom,wish:final.wish})}}]});
   const calls=repairTurn===1?[['fetch_url',{url:'https://source.test/story'}],['validate_cover',{url:'https://source.test/cover.jpg'}]]:[['complete_post',{caption:caption(wisdom),wisdom,source_url:'https://source.test/story',image_url:'https://source.test/cover.jpg',category:'Golden archive'}]];
   return json({choices:[{message:{role:'assistant',tool_calls:calls.map(([name,args],i)=>({id:`repair${generations}-${i}`,type:'function',function:{name,arguments:JSON.stringify(args)}}))}}]});
 }

 if(process.env.TEST_VERDICT==='late-replace'&&generations<=27) return json({choices:[{message:{role:'assistant',content:'Still searching.'}}]});
 if(process.env.TEST_VERDICT==='late-replace') generations-=27;
 if(!req.tools) return json({choices:[{message:{role:'assistant',content:JSON.stringify(generations===1?fixture:final)}}]});
 const story=generations>=3?'https://source.test/other-story':'https://source.test/story';
 const calls=generations===3?[['fetch_url',{url:story}],['validate_cover',{url:'https://source.test/cover.jpg'}]]:generations===1?[['fetch_url',{url:'https://source.test/story'}],['validate_cover',{url:'https://source.test/cover.jpg'}]]:[['complete_post',{caption:caption(generations===2?fixture.wisdom:final.wisdom),wisdom:generations===2?fixture.wisdom:final.wisdom,source_url:story,image_url:'https://source.test/cover.jpg',category:'Golden archive'}]];
 if(process.env.TEST_VERDICT==='supporting'&&generations===1) calls.push(['fetch_url',{url:'https://source.test/supporting'}]);
 if(['supporting','unverified-source'].includes(process.env.TEST_VERDICT)&&generations!==1) calls[0][1].supporting_urls=['https://source.test/supporting'];
 if(process.env.TEST_VERDICT==='late-replace') generations+=27;
 return json({choices:[{message:{role:'assistant',tool_calls:calls.map(([name,args],i)=>({id:`call${generations}-${i}`,type:'function',function:{name,arguments:JSON.stringify(args)}}))}}]});
 }
 if(String(url).includes('source.test')) {
 const res=new Response(String(url).endsWith('.jpg')?'image':'<meta property="og:image" content="https://source.test/cover.jpg">A useful object was found.',{headers:{'content-type':String(url).endsWith('.jpg')?'image/jpeg':'text/html'}});
 Object.defineProperty(res,'url',{value:String(url)});return res;
 }
 if(String(url).includes('connect.composio.dev')) {
 const req=JSON.parse(opts.body);let result={};
 if(req.method==='tools/list') throw new Error('Writer must not load unrelated Composio tool descriptions');
 if(req.method==='tools/call') {
 const {name,arguments:args}=req.params;let data={};
 if(name==='COMPOSIO_SEARCH_TOOLS') data={session:{id:'test'},toolkit_connection_statuses:[{toolkit:'telegram',accounts:[{alias:'pizdato-net-channel',status:'ACTIVE'}]}]};
 if(name==='COMPOSIO_MULTI_EXECUTE_TOOL') {
 const send=args.tools.find(t=>t.tool_slug.startsWith('TELEGRAM_SEND'));
 if(send) await appendFile(process.env.TEST_TRACE,`SEND ${JSON.stringify(send.arguments)}\n`);
 data={results:[{response:{successful:true,data:{ok:true,result:send?{message_id:987,chat:channel}:channel}}}]};
 }
 result={structuredContent:data};
 }
 return json({result});
 }
 throw new Error(`Unexpected network: ${url}`);
};
