import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {composeRubric,TEMPLATES} from '../compose-rubric.mjs';
import {createGate,reviewOptions,editorOptions,proofreaderOptions,verifierOptions,BLOCKERS} from '../gate.mjs';
import channel from '../profiles/pizdato-channel.mjs';
import neutral from './profiles/neutral.mjs';
import column from './profiles/example-column.mjs';
// Design 9: no channel term may survive in a profile that declares none of the channel's features.
export const BANNED=['pizdato','Пиздато','Хуёво','Миша','Misha','дядя','Мудрость','wisdom','Telegram','канал','channel','утр','morning','вечер','evening','weekday','рубрик','CTA','☕','✨','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'];
// Terms match case-insensitively at the start of a word: stems such as «утр» and «рубрик» catch every form,
// while «CTA» inside «predictable» is no channel term.
export const bannedIn=text=>{const t=text.toLocaleLowerCase('ru');return BANNED.filter(b=>new RegExp(`(?<!\\p{L})${b.toLocaleLowerCase('ru')}`,'u').test(t));};
export function lint(text){
 const found=[];
 text.split('\n').forEach((line,i)=>{
  const at=what=>found.push(`${i+1}: ${what}: ${line.slice(0,80)}`);
  if(/ {2}/.test(line))at('doubled space');
  if(/ ,|\(\)|(?<!\.)\.\.(?!\.)/.test(line))at('stray punctuation');
  if(/^\s*(?:[-*]|\d+\.)\s*$/.test(line))at('empty list item');
  if(/(?:^|\s)(?:и|или|and|or)\s*[.,;:)]/iu.test(line))at('dangling conjunction');
  if(/^\p{Ll}/u.test(line))at('lower-case line start');
 });
 return found;
}
const issue=(category,quote,problem='Defect')=>({category,quote,problem,fix:'Fix it'});
const reply=(...issues)=>({content:JSON.stringify({issues})});
function fake({editor=()=>reply(),proofreader=()=>reply(),verifier=m=>({content:JSON.stringify({verdicts:JSON.parse(m[1].content).claims.map(c=>({id:c.id,real:true,category:c.category,ground:'confirmed',reason:'ok'}))})})}={}){
 const sent=[];
 return {sent,request:async(m,o)=>{sent.push({m,o});return o.title==='pizdato-proofreader'?proofreader(m):o.title==='pizdato-verifier'?verifier(m):editor(m);}};
}
test('the lint finds each readability defect it names',()=>{
 for(const bad of ['Two  spaces.','Odd , comma.','Empty () brackets.','Double.. stop.','-  ','- ','Ends with и.','Ends with or;','lower start.'])assert.notDeepEqual(lint(bad),[],bad);
 assert.deepEqual(lint('Fine text… with «quotes», (brackets) and — dashes.\n- `token`: a lower-case bullet is fine.'),[]);
});
test('neutral rubrics carry no channel term, read cleanly and match the committed snapshots',async()=>{
 for(const name of TEMPLATES){
  const text=composeRubric(name,neutral);
  assert.deepEqual(bannedIn(text),[],name);assert.deepEqual(lint(text),[],name);
  assert.equal(text,await readFile(new URL(`./profiles/neutral/${name}.md`,import.meta.url),'utf8'),`${name} snapshot`);
 }
});
test('a neutral review completes and sends no channel term in prompts, schemas or messages',async()=>{
 const f=fake({editor:()=>reply(issue('meaning','каждый раз','Contradiction'),issue('humor','шутка','Flat')),verifier:m=>({content:JSON.stringify({verdicts:[{id:0,real:false,category:'meaning',ground:'understood-joke',reason:'A joke'}]})})});
 const gate=createGate({profile:neutral,request:f.request,history:[{name:'a.md',text:'Прошлый текст про кота.'}]});
 const r=await gate.review({text:'Кот каждый раз находит тёплое место, и шутка в том, что место всегда занято.',source:{primary:{url:'https://example.com/cat',text:'Cats look for warm places.'}}});
 assert.equal(r.decision,'approve');assert.deepEqual(f.sent.map(s=>s.o.title).sort(),['pizdato-editor','pizdato-proofreader','pizdato-verifier']);
 for(const {m,o} of f.sent){const {title,...options}=o;assert.deepEqual(bannedIn(JSON.stringify(m)+JSON.stringify(options)),[],title);}
 assert.equal(JSON.parse(f.sent.find(s=>s.o.title==='pizdato-editor').m[1].content).contentType,'sourced-text');
});
test('profile-dependent enums: the neutral schemas offer no channel suggestion or ground',()=>{
 const {editor,verifier}=reviewOptions(neutral);
 const suggestions=editor.responseFormat.json_schema.schema.properties.issues.items.properties.category.enum;
 assert.deepEqual(suggestions,[...BLOCKERS,'humor','style']);
 assert.deepEqual(verifier.responseFormat.json_schema.schema.properties.verdicts.items.properties.ground.enum,['confirmed','correct-as-written','faithful-to-source','understood-joke','taste','misread']);
 assert.deepEqual(reviewOptions(column).editor.responseFormat.json_schema.schema.properties.issues.items.properties.category.enum,[...BLOCKERS,'humor','headline','style']);
 assert.ok(reviewOptions(column).verifier.responseFormat.json_schema.schema.properties.verdicts.items.properties.ground.enum.includes('persona-opinion'));
});
test('the channel keeps its enums in their release order',()=>{
 assert.deepEqual(editorOptions.responseFormat.json_schema.schema.properties.issues.items.properties.category.enum,[...BLOCKERS,'humor','wisdom','style','category']);
 assert.deepEqual(verifierOptions.responseFormat.json_schema.schema.properties.verdicts.items.properties.ground.enum,['confirmed','correct-as-written','faithful-to-source','persona-opinion','verdict-contrast','understood-joke','loose-category','taste','misread']);
});
test('channel options keep their identity, are memoized and frozen',async()=>{
 const options=reviewOptions(channel);
 assert.equal(options,reviewOptions(channel));assert.equal(options.editor,editorOptions);assert.equal(options.proofreader,proofreaderOptions);assert.equal(options.verifier,verifierOptions);
 assert.ok(Object.isFrozen(options)&&Object.isFrozen(editorOptions)&&Object.isFrozen(editorOptions.responseFormat.json_schema.schema.properties.issues.items.properties.category.enum));
 const f=fake({editor:()=>reply(issue('grammar','x'))});const gate=createGate({profile:channel,request:f.request,history:[]});
 assert.equal(gate.options,options);await gate.review({text:'x',fields:{wisdom:'x'}});
 assert.deepEqual(new Set(f.sent.map(s=>s.o)),new Set([editorOptions,proofreaderOptions,verifierOptions]));
});
test('without a persona a misattribution claim clears only as faithful-to-source or misread',async()=>{
 const run=ground=>{const f=fake({editor:()=>reply(issue('misattribution','сказал кот','Words of the owner')),verifier:m=>({content:JSON.stringify({verdicts:[{id:0,real:false,category:'misattribution',ground,reason:'x'}]})})});
  return createGate({profile:neutral,request:f.request,history:[]}).review({text:'«Мяу», сказал кот.',source:{primary:{url:'https://example.com',text:'evidence'}}});};
 for(const ground of ['faithful-to-source','misread'])assert.equal((await run(ground)).decision,'approve',ground);
 for(const ground of ['understood-joke','taste','correct-as-written'])assert.equal((await run(ground)).decision,'revise',ground);
 await assert.rejects(run('persona-opinion'),/Malformed/,'the ground is not even in the neutral schema');
});
test('a language claim dismissed as taste keeps blocking under every profile',async()=>{
 for(const [profile,fields] of [[channel,{wisdom:'w'}],[neutral,{}],[column,{title:'Заголовок'}]]){
  const f=fake({proofreader:()=>reply(issue('grammar','кофе остыла','Agreement')),verifier:()=>({content:JSON.stringify({verdicts:[{id:0,real:false,category:'grammar',ground:'taste',reason:'x'}]})})});
  assert.equal((await createGate({profile,request:f.request,history:[]}).review({text:'Кофе остыла.',fields})).decision,'revise',profile.id);
 }
});
test('missing, undefined or undeclared fields and oversized text fail before any request',async()=>{
 for(const [profile,fields,text] of [[channel,{},'x'],[channel,{wisdom:undefined},'x'],[channel,{wisdom:'w',title:'t'},'x'],[neutral,{wisdom:'w'},'x'],[column,{},'x'],[neutral,{},'я'.repeat(4097)]]){
  const f=fake(),records=[];const gate=createGate({profile,request:f.request,history:[],record:async r=>records.push(r)});
  await assert.rejects(gate.review({text,fields}),e=>e.code==='EDITORIAL_CONFIG',JSON.stringify(fields));
  assert.equal(f.sent.length,0);assert.deepEqual(records,[]);assert.deepEqual(gate.snapshot(),{attempts:0,story:1,revision:0,abandoned:[]});
 }
 assert.equal((await createGate({profile:neutral,request:fake().request,history:[]}).review({text:'я'.repeat(4096)})).decision,'approve');
});
test('a gate without a valid profile is never constructed',()=>{
 assert.throws(()=>createGate({request:async()=>reply(),history:[]}),e=>e.code==='EDITORIAL_CONFIG');
 assert.throws(()=>createGate({profile:{...neutral,language:'uk'},request:async()=>reply(),history:[]}),e=>e.code==='EDITORIAL_CONFIG');
});
test('the column profile runs the whole flow with a persona, first person and its own title check',async()=>{
 const f=fake({editor:()=>reply(issue('humor','я','Flat'),issue('misattribution','решил, что это знак','Words of a real commuter')),verifier:()=>({content:JSON.stringify({verdicts:[{id:0,real:false,category:'misattribution',ground:'persona-opinion',reason:'The narrator\'s own reflection'}]})})});
 const text='Я опять опоздал на электричку и решил, что это знак.';
 const ok=await createGate({profile:column,request:f.request,history:[]}).review({text,fields:{title:'Знак свыше'},source:{primary:{url:'https://example.com/train',text:'Trains were late.'}}});
 assert.equal(ok.decision,'approve');assert.equal(ok.dismissed[0].ground,'persona-opinion');
 const input=JSON.parse(f.sent.find(s=>s.o.title==='pizdato-editor').m[1].content);
 assert.deepEqual(Object.keys(input).slice(0,3),['contentType','candidate','title']);assert.equal(input.contentType,'reported-column');
 const editorPrompt=f.sent.find(s=>s.o.title==='pizdato-editor').m[0].content;
 assert.match(editorPrompt,/Аркадий Петрович/);assert.doesNotMatch(editorPrompt,/first-person narration;/);
 const repeated=await createGate({profile:column,request:fake().request,history:[{name:'column-1.md',text:'# Знак свыше!\n\nСтарая колонка.'}]}).review({text,fields:{title:'знак  свыше'}});
 assert.equal(repeated.decision,'replace');assert.deepEqual(repeated.blockers.at(-1),{category:'repetition',quote:'знак  свыше',problem:'Title repeats a published column.',fix:'Choose a different subject and title.',by:'host'});
});
test('the repeated channel wisdom keeps its exact host blocker',async()=>{
 const r=await createGate({profile:channel,request:fake().request,history:[{text:'«Same wisdom!»'}]}).review({text:'same wisdom',fields:{wisdom:'same wisdom'}});
 assert.deepEqual(r.blockers,[{category:'repetition',quote:'same wisdom',problem:'Wisdom repeats a confirmed publication.',fix:'Choose a different subject and wisdom.',by:'host'}]);
});
test('production entrypoints import the channel profile directly, with no profile selection by environment',async()=>{
 for(const path of ['deploy/evening/agent.mjs','deploy/evening/worker.mjs','deploy/evening/network.mjs','deploy/morning/agent.mjs']){
  const source=await readFile(path,'utf8');
  assert.match(source,/^import channel from '\.\.\/editorial\/profiles\/pizdato-channel\.mjs';$/m,path);
  assert.doesNotMatch(source,/PROFILE|profiles\/\$\{/,path);
 }
});
