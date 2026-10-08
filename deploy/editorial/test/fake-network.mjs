// External HTTP boundary only: run real hosts, real rendering and real editorial gate.
import {appendFile} from 'node:fs/promises';
const channel={id:-1004350521393,username:'pizdato_net'};
let generations=0,reviews=0;
const json=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
const fixture={wisdom:'Если долго искать свободное время, его обязательно займут поиски свободного времени.',wish:'Дня, в котором найдётся место для маленькой приятной глупости.'};
const final={wisdom:'Самый короткий список покупок обычно получается сразу после возвращения из магазина.',wish:'Пусть сегодня всё нужное обнаружится в ближайшем ящике.'};
const caption=w=>`Дядя Миша оценил находку. Пиздато: вещь пригодилась. Хуёво: пришлось искать.\nМудрость дня: «${w}»\nМир ждёт твоего голоса: https://pizdato.net`;
globalThis.fetch=async(url,opts={})=>{
 if(String(url).includes('openrouter.ai')) {
 const req=JSON.parse(opts.body);
 if(req.messages[0].content.startsWith('# Public message editorial review')) {
 reviews++;
 await appendFile(process.env.TEST_TRACE,`REVIEW ${reviews}\n`);
 if(process.env.TEST_VERDICT==='timeout') throw new Error('editor timeout');
 if(process.env.TEST_VERDICT==='malformed') return json({choices:[{message:{content:'{}'}}]});
 const pass=process.env.TEST_VERDICT==='approve'||(process.env.TEST_VERDICT==='replace'&&reviews===2);
 return json({choices:[{message:{content:JSON.stringify({decision:pass?'approve':'revise',grammar:true,meaning:pass,freshness:true,voice:true,grounding:true,issues:pass?[]:['Choose another subject.']})}}]});
 }
 generations++;
 if(!req.tools) return json({choices:[{message:{role:'assistant',content:JSON.stringify(generations===1?fixture:final)}}]});
 const story=generations>=3?'https://source.test/other-story':'https://source.test/story';
 const calls=generations===3?[['fetch_url',{url:story}],['validate_cover',{url:'https://source.test/cover.jpg'}]]:generations===1?[['fetch_url',{url:'https://source.test/story'}],['validate_cover',{url:'https://source.test/cover.jpg'}]]:[['complete_post',{caption:caption(generations===2?fixture.wisdom:final.wisdom),wisdom:generations===2?fixture.wisdom:final.wisdom,source_url:story,image_url:'https://source.test/cover.jpg',category:'Golden archive'}]];
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
