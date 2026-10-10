// Golden cases for channel equivalence (editorial-profiles, design 7). The same driver runs the da0b2ed gate through its
// old API at capture time and the profile gate in golden.test.mjs; everything compared is an exact serialized string.
export const BASELINE='da0b2ed148824eea84e39a30a7faeedc9db2ee3f';
const HOST=['Пиздато:','Хуёво:','Мудрость дня:','Мир ждёт твоего голоса: https://pizdato.net'];
const wisdom='Будильник не делает утро добрым, он просто первым берёт на себя вину';
const wish='Пусть сегодня сбудутся планы, а уведомления хотя бы постесняются.';
const morningText=`☕ Мудрость дня от дяди Миши:\n«${wisdom}».\n\n✨ ${wish}`;
const eveningWisdom='Если долго искать потерянный носок, можно случайно найти смысл жизни под диваном';
const evening=(huevo='весь подъезд проснулся в пять утра.')=>`Будильник зазвонил на час раньше обычного.\n\nДядя Миша проверил: батарейка жива, а стрелки убежали вперёд. Производитель признал брак всей партии.\n\nПиздато: никто в доме не проспал.\nХуёво: ${huevo}\n\nМудрость дня: «${eveningWisdom}».\n\nМир ждёт твоего голоса: https://pizdato.net`;
const source={primary:{url:'https://source.test/story',text:'The manufacturer recalled a batch of alarm clocks that ring an hour early.',covers:['https://source.test/cover.jpg'],fetchedAt:'2026-10-09T15:00:00.000Z'},supporting:[],editionDate:'2026-10-09',currentDate:'2026-10-09',category:'Пятница — свободный микрофон',weekday:'Friday'};
const history=[{name:'morning-2026-10-08.md',text:'# Morning wisdom 2026-10-08\n\n☕ Мудрость дня от дяди Миши:\n«Кофе не решает проблемы, но делает их терпимыми до обеда».\n'},{name:'evening-2026-10-08.md',text:'# Evening post 2026-10-08\n\nКапибара сбежала из зоопарка.\n\nМудрость дня: «Свобода пахнет мокрой травой и чужими огородами».\n'}];
const issue=(category,quote,problem,fix='Concrete correction')=>({category,quote,problem,fix});
const issues=(...list)=>({content:JSON.stringify({issues:list})});
const verdicts=(...list)=>({content:JSON.stringify({verdicts:list})});
const v=(id,real,category,ground,reason='checked')=>({id,real,category,ground,reason});
export const CASES=[
 {name:'morning observation',input:{history,steps:[{text:morningText,wisdom}]},answers:{
  'pizdato-proofreader#1':issues(),
  'pizdato-editor#1':issues(issue('humor','первым берёт на себя вину','The punchline is predictable','Sharper turn'),issue('wisdom',wisdom,'Restates a familiar joke','Stronger twist'))}},
 {name:'evening first review with a source',input:{policy:'persistent-evening',history,steps:[{text:evening('весь подъезд проснулась в пять утра.'),wisdom:eveningWisdom,hostText:HOST,source}]},answers:{
  'pizdato-proofreader#1':issues(issue('grammar','подъезд проснулась','Agreement of gender','подъезд проснулся')),
  'pizdato-editor#1':issues(issue('unsupported-claim','Производитель признал брак всей партии','The source names one batch only','Name the batch'),issue('ai-slop','Дядя Миша проверил','Invented narrator scene','Remove the scene'),issue('category','Будильник','Fits the category loosely','Another story'),issue('style','на час раньше обычного','Wordy','на час раньше')),
  'pizdato-verifier#1':verdicts(v(0,true,'grammar','confirmed'),v(1,false,'unsupported-claim','faithful-to-source','The source says the batch was recalled'),v(2,true,'ai-slop','confirmed'))}},
 {name:'evening revision with changed sections and a verifier round',input:{policy:'persistent-evening',initial:{attempts:1,story:1,revision:1,abandoned:[]},history,steps:[{text:evening(),wisdom:eveningWisdom,hostText:HOST,changedSections:['huevo','wisdom'],source}]},answers:{
  'pizdato-proofreader#1':issues(),
  'pizdato-editor#1':issues(issue('meaning','весь подъезд проснулся в пять утра','The verdict line contradicts the story','Align it')),
  'pizdato-verifier#1':verdicts(v(0,false,'meaning','understood-joke','A comic exaggeration a reader understands'))}},
 {name:'malformed first answer',input:{history:[],steps:[{text:morningText,wisdom}]},answers:{
  'pizdato-proofreader#1':issues(),
  'pizdato-editor#1':{content:'{"issues":'},
  'pizdato-editor#2':issues()}},
 {name:'verifier dismissal outside the allow-list',input:{policy:'persistent-evening',history,steps:[{text:evening(),wisdom:eveningWisdom,hostText:HOST,source}]},answers:{
  'pizdato-proofreader#1':issues(issue('wrong-phrase','стрелки убежали вперёд','Wrong collocation','стрелки ушли вперёд')),
  'pizdato-editor#1':issues(issue('misattribution','Производитель признал брак всей партии','The source gives these words to a retailer','Restore the speaker'),issue('misattribution','Дядя Миша проверил','A quote moved to the persona','Restore the speaker'),issue('meaning','никто в доме не проспал','Contradiction','Fix it')),
  'pizdato-verifier#1':verdicts(v(0,false,'wrong-phrase','taste','Acceptable style'),v(1,false,'misattribution','understood-joke','A joke'),v(2,false,'misattribution','persona-opinion','His own remark'),v(3,false,'meaning','verdict-contrast','Opposite sides by design'))}},
 {name:'host-owned quote',input:{policy:'persistent-evening',history,steps:[{text:evening(),wisdom:eveningWisdom,hostText:HOST,source}]},answers:{
  'pizdato-proofreader#1':issues(issue('spelling','Хуёво','Profanity','Remove')),
  'pizdato-editor#1':issues(issue('ai-slop','Мир ждёт твоего голоса: https://pizdato.net','Promotional CTA','Remove'),issue('ai-slop','Мудрость дня','Rubric label','Remove'),issue('grammar','проснулся','Agreement','Fix')),
  'pizdato-verifier#1':verdicts(v(0,true,'grammar','confirmed'))}},
 {name:'misattribution without evidence',input:{history,steps:[{text:morningText,wisdom}]},answers:{
  'pizdato-proofreader#1':issues(),
  'pizdato-editor#1':issues(issue('misattribution',`«${wisdom}»`,'A saying credited to the persona','Credit the saying'))}},
 {name:'repeated wisdom',input:{history:[...history,{name:'morning-2026-10-09.md',text:`☕ Мудрость дня от дяди Миши:\n«${wisdom.toUpperCase()}!»`}],steps:[{text:morningText,wisdom}]},answers:{
  'pizdato-proofreader#1':issues(),
  'pizdato-editor#1':issues(issue('style','просто','Filler word','Remove'))}},
 {name:'replace decision and story advance',input:{policy:'persistent-evening',initial:{attempts:3,story:1,revision:2,abandoned:[{story:0,text:'Old abandoned premise'}]},history,steps:[{text:evening(),wisdom:eveningWisdom,hostText:HOST,source},{text:evening('соседи завели второй будильник.'),wisdom:'Даже точное время бывает лишним, если оно приходит раньше всех',hostText:HOST,source}]},answers:{
  'pizdato-proofreader#1':issues(),
  'pizdato-editor#1':issues(issue('repetition','Будильник зазвонил на час раньше','The subject repeats a confirmed post','Choose another story'),issue('grammar','на час раньше обычного','Wrong comparison','Fix')),
  'pizdato-verifier#1':verdicts(v(0,true,'repetition','confirmed'),v(1,true,'grammar','confirmed')),
  'pizdato-proofreader#2':issues(),
  'pizdato-editor#2':issues()}}
];
// Requests are keyed by title and per-title sequence, so parallel reviewers cannot reorder the comparison.
export function scripted(answers){
 const seq={},requests=[];
 const request=async(messages,options)=>{
  const key=`${options.title}#${seq[options.title]=(seq[options.title]||0)+1}`;
  requests.push({key,messages:JSON.stringify(messages),options:JSON.stringify(options)});
  if(!answers[key])throw new Error(`Unscripted request ${key}`);
  return {content:answers[key].content};
 };
 return {request,requests};
}
export async function runCase({input,answers},{createGate,review}){
 const {request,requests}=scripted(answers),records=[],results=[];
 const gate=createGate({request,history:input.history,policy:input.policy,initial:input.initial,record:async r=>{records.push(JSON.stringify(r));}});
 for(const step of input.steps){try{results.push(JSON.stringify(await review(gate,step)));}catch(error){results.push(JSON.stringify({error:error.message}));}}
 return {requests:requests.sort((a,b)=>a.key.localeCompare(b.key)),results,records,snapshot:JSON.stringify(gate.snapshot())};
}
// The preflight sends real enum schemas; only the HTTP boundary is faked, with fixed credentials and model names.
const ENV={OPENROUTER_API_KEY:'fixture',COMPOSIO_CONSUMER_KEY:'fixture',PIZDATO_EVENING_MODEL:'writer/model',PIZDATO_EDITOR_MODEL:'editor/model'};
export async function runPreflight({createServices,Budget,EditionStore}){
 const saved={...process.env},seq={},requests=[];
 for(const k of Object.keys(process.env))if(/^(PIZDATO_|OPENROUTER|NOUS_|COMPOSIO_)/.test(k))delete process.env[k];
 Object.assign(process.env,ENV);
 const log=console.log;console.log=()=>{};
 try{
  const budget=new Budget({resolver:async()=>[{address:'8.8.8.8'}],fetcher:async(u,o)=>{
   if(u.includes('connect.composio')){const req=JSON.parse(o.body);let payload={};
    if(req.method==='tools/call')payload=req.params.name==='COMPOSIO_SEARCH_TOOLS'?{data:{session:{id:'t'},toolkit_connection_statuses:[{toolkit:'telegram',accounts:[{alias:'pizdato-net-channel',status:'ACTIVE'}]}]}}:{data:{results:[{response:{successful:true,data:{ok:true,result:{id:-1004350521393,username:'pizdato_net'}}}}]}};
    return new Response(JSON.stringify({result:{structuredContent:payload}}));}
   const title=o.headers['X-Title'],req=JSON.parse(o.body);
   requests.push({key:`${title}#${seq[title]=(seq[title]||0)+1}`,url:u,headers:JSON.stringify(o.headers),body:o.body});
   const name=req.response_format?.json_schema?.name;
   const message=name==='editorial_verdict'?{content:'{"issues":[]}'}:name==='defect_verification'?{content:'{"verdicts":[]}'}:req.response_format?{content:'{"ok":true}'}:req.tools?{tool_calls:[{id:'1',type:'function',function:{name:'ping',arguments:'{"value":"pizdato"}'}}]}:{content:'LLM_OK'};
   return new Response(JSON.stringify({model:req.model,choices:[{message}]}));
  }});
  let error=null;
  try{await createServices({store:new EditionStore('/nonexistent/pizdato-golden-preflight'),vault:'/nonexistent/pizdato-golden-vault',budget,dryRun:true}).check();}catch(e){error=e.message;}
  return {requests,error};
 }finally{
  console.log=log;
  for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);
 }
}
