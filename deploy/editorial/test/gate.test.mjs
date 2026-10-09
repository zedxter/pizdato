import test from 'node:test';
import assert from 'node:assert/strict';
import {createGate, assertApproved, editorOptions, proofreaderOptions, verifierOptions} from '../gate.mjs';
const issue=(category,quote='проблемный фрагмент',problem='Explain the defect')=>({category,quote,problem,fix:'Concrete correction'});
const reply=(...issues)=>({content:JSON.stringify({issues})});
// Most tests drive only the editor: the proofreader stays clean and the verifier confirms every claimed blocker.
const confirmAll=m=>({content:JSON.stringify({verdicts:JSON.parse(m[1].content).claims.map(c=>({id:c.id,real:true,category:c.category,ground:'confirmed',reason:'confirmed'}))})});
const editor=fn=>async(m,o)=>o===proofreaderOptions?reply():o===verifierOptions?confirmAll(m):fn(m,o);
test('approval requires zero blocker issues while suggestions never block publication',async()=>{
 const gate=createGate({request:editor(async()=>reply(issue('wisdom','Ближнее иногда работает линзой','Predictable'),issue('humor'))),history:[],record:async()=>{}});
 const result=await gate.review({text:'Готовый текст.',wisdom:'Ближнее иногда работает линзой'});
 assert.equal(result.decision,'approve');assert.equal(result.nextAction,'publish');
 assert.deepEqual(result.blockers,[]);assert.equal(result.suggestions.length,2);assert.deepEqual(result.issues,[]);
 assert.doesNotThrow(()=>assertApproved('Готовый текст.',result));
 assert.throws(()=>assertApproved('Changed text',result),/approval/i);
});
for(const category of ['spelling','grammar','punctuation','wrong-phrase','meaning','unsupported-claim','ai-slop']) {
 test(`${category} is a blocker that requires repair and cannot authorize delivery`,async()=>{
  const gate=createGate({request:editor(async()=>reply(issue(category))),history:[]});
  const result=await gate.review({text:'Кофе остыла.',wisdom:'Кофе остыла.'});
  assert.equal(result.decision,'revise');assert.equal(result.nextAction,'repair');assert.equal(result.blockers.length,1);
  assert.throws(()=>assertApproved('Кофе остыла.',result),/approval/i);
 });
}
test('a separate proofreader sees only the candidate text and its language defects block publication',async()=>{
 const calls=[];
 const gate=createGate({history:[{name:'evening-2026-10-08.md',text:'Опубликованный пост'}],request:async(m,o)=>{calls.push({options:o,input:JSON.parse(m[1].content)});return o===verifierOptions?confirmAll(m):o===proofreaderOptions?reply(issue('spelling','поллуны','Hyphen required')):reply();}});
 const r=await gate.review({text:'Дыра в поллуны.',wisdom:'Дыра в поллуны',source:{primary:{url:'https://example.com',text:'evidence'}}});
 assert.equal(r.decision,'revise');assert.equal(r.blockers[0].quote,'поллуны');assert.equal(r.blockers[0].by,'proofreader');
 const proof=calls.find(c=>c.options===proofreaderOptions),edit=calls.find(c=>c.options===editorOptions);
 assert.deepEqual(Object.keys(proof.input),['candidate']);assert.equal(proof.input.candidate,'Дыра в поллуны.');
 assert.ok(edit.input.history.length===1&&edit.input.source.primary.url);
 assert.deepEqual(proofreaderOptions.responseFormat.json_schema.schema.properties.issues.items.properties.category.enum,['spelling','grammar','punctuation','wrong-phrase']);
});
test('issues reported by both reviewers are merged without duplicates',async()=>{
 const gate=createGate({history:[],request:async(m,o)=>o===verifierOptions?confirmAll(m):reply(issue('grammar','Кофе остыла','Agreement'))});
 const r=await gate.review({text:'Кофе остыла.',wisdom:'w'});
 assert.equal(r.blockers.length,1);
});
test('dimension booleans are derived from blocker categories only',async()=>{
 const gate=createGate({request:editor(async()=>reply(issue('spelling'),issue('unsupported-claim'),issue('style'))),history:[]});
 const r=await gate.review({text:'draft',wisdom:'draft'});
 assert.deepEqual([r.grammar,r.meaning,r.freshness,r.voice,r.grounding],[false,true,true,true,false]);
});
for(const category of ['repetition','unusable-source']) {
 test(`${category} replaces the story immediately`,async()=>{
  const gate=createGate({request:editor(async()=>reply(issue('grammar'),issue(category))),history:[]});
  const r=await gate.review({text:'draft',wisdom:'draft'});
  assert.equal(r.decision,'replace');assert.equal(r.nextAction,'replace');assert.deepEqual(gate.state,{story:2,revision:0,done:false});
 });
}
for(const [name,response] of Object.entries({malformed:'oops',missing:JSON.stringify({}),legacy:JSON.stringify({decision:'approve',grammar:true,meaning:true,freshness:true,voice:true,grounding:true,issues:[]}),unknown:JSON.stringify({issues:[{...issue('grammar'),category:'vibes'}]}),extra:JSON.stringify({issues:[],decision:'approve'}),empty:JSON.stringify({issues:[{...issue('grammar'),problem:' '}]})})) {
 test(`fails closed on ${name} editor response`,async()=>{
  const gate=createGate({request:editor(async()=>({content:response})),history:[]});
  await assert.rejects(gate.review({text:'candidate',wisdom:'candidate'}));
 });
}
test('a proofreader outside its language categories fails closed',async()=>{
 const gate=createGate({history:[],request:async(m,o)=>o===proofreaderOptions?reply(issue('humor')):o===verifierOptions?confirmAll(m):reply()});
 await assert.rejects(gate.review({text:'candidate',wisdom:'candidate'}),/Malformed/);
});
test('reviewer transport failure is fatal and terminal',async()=>{
 const gate=createGate({request:async(m,o)=>{if(o===proofreaderOptions)throw new Error('timeout');return o===verifierOptions?confirmAll(m):reply();},history:[]});
 await assert.rejects(gate.review({text:'draft',wisdom:'draft'}),/timeout/);
 await assert.rejects(gate.review({text:'retry',wisdom:'retry'}),/terminal/);
});
test('failed editor preserves rejected text locally without recording raw service errors',async()=>{
 const records=[];
 const gate=createGate({request:async()=>{throw new Error('sensitive remote detail');},history:[],record:async r=>records.push(r)});
 await assert.rejects(gate.review({text:'rejected draft',wisdom:'draft'}));
 assert.equal(records[0]?.text,'rejected draft');assert.equal(records[0]?.error,'Editorial review unavailable or invalid');
 assert.ok(!JSON.stringify(records).includes('sensitive'));
});
test('bounded morning policy: nine repairable rejections exhaust three subjects',async()=>{
 let calls=0;
 const gate=createGate({request:editor(async()=>{calls++;return reply(issue('meaning'));}),history:[]});
 const actions=[];for(let i=0;i<9;i++) actions.push((await gate.review({text:`candidate ${i}`,wisdom:`candidate ${i}`})).nextAction);
 assert.deepEqual(actions,['repair','repair','replace','repair','repair','replace','repair','repair','stop']);
 await assert.rejects(gate.review({text:'fourth',wisdom:'fourth'}),/terminal/);
 assert.equal(calls,9);
});
test('persistent evening policy replaces a story after four failed repairs and keeps going',async()=>{
 const records=[];
 const gate=createGate({policy:'persistent-evening',request:editor(async()=>reply(issue('grammar'))),history:[],record:async r=>records.push(r)});
 const actions=[];for(let i=0;i<12;i++) actions.push((await gate.review({text:`draft ${i}`,wisdom:`w ${i}`})).nextAction);
 assert.deepEqual(actions,['repair','repair','repair','repair','replace','repair','repair','repair','repair','replace','repair','repair']);
 assert.deepEqual(gate.state,{story:3,revision:2,done:false});
 assert.deepEqual(records.slice(0,6).map(r=>[r.story,r.revision]),[[1,0],[1,1],[1,2],[1,3],[1,4],[2,0]]);
});
test('suggestion-only reviews approve under both policies',async()=>{
 for(const policy of ['bounded','persistent-evening']) {
  const gate=createGate({policy,request:editor(async()=>reply(issue('humor'),issue('style'))),history:[]});
  assert.equal((await gate.review({text:'draft',wisdom:'draft'})).decision,'approve',policy);
 }
});
test('editor reviews each revision fresh: no earlier drafts or findings of the current story, only changed sections',async()=>{
 const prompts=[];
 const replies=[reply(issue('grammar','Кратер выбила','Wrong agreement')),reply(issue('repetition','Тыква','Already published')),reply()];
 const gate=createGate({policy:'persistent-evening',history:[],request:editor(async m=>{prompts.push(JSON.parse(m[1].content));return replies.shift();})});
 await gate.review({text:'Кратер выбила удар.',wisdom:'first'});
 await gate.review({text:'Тыква весом в тонну.',wisdom:'second',changedSections:['hook']});
 await gate.review({text:'Совсем другой сюжет.',wisdom:'third'});
 assert.deepEqual(prompts[1].current,{attempt:2,story:1,revision:1});assert.deepEqual(prompts[1].changedSections,['hook']);
 assert.deepEqual(prompts[2].abandonedStories,[{story:1,text:'Тыква весом в тонну.'}]);
 for(const p of prompts) {
  assert.equal('rejectedCandidates' in p,false);assert.equal('previousBlockers' in p,false);
  assert.ok(!JSON.stringify(p).includes('Wrong agreement')&&!JSON.stringify(p).includes('Already published'));
 }
 assert.ok(!JSON.stringify(prompts[1]).includes('Кратер выбила'),'the rejected draft of the current story is not shown again');
});
test('snapshot restores counters and abandoned stories in a later activation',async()=>{
 const first=createGate({policy:'persistent-evening',history:[],request:editor(async()=>reply(issue('repetition')))});
 await first.review({text:'abandoned premise',wisdom:'w'});
 let context;
 const second=createGate({policy:'persistent-evening',history:[],initial:first.snapshot(),request:editor(async m=>{context=JSON.parse(m[1].content);return reply();})});
 await second.review({text:'new premise',wisdom:'w2'});
 assert.deepEqual(context.current,{attempt:2,story:2,revision:0});assert.equal(context.abandonedStories[0].text,'abandoned premise');
});
test('normalized wisdom repetition is replaced even when the editor approves',async()=>{
 const gate=createGate({request:editor(async()=>reply()),history:[{text:'«Same wisdom!»'}]});
 const result=await gate.review({text:'same wisdom',wisdom:'same wisdom'});
 assert.equal(result.decision,'replace');assert.equal(result.freshness,false);
});
test('unquoted evening wisdom cannot be recycled',async()=>{
 const gate=createGate({request:editor(async()=>reply()),history:[{text:'Мудрость дня: Same wisdom!\nCTA'}]});
 assert.equal((await gate.review({text:'same wisdom',wisdom:'same wisdom'})).decision,'replace');
});
test('records keep exact text hash, blockers, suggestions and next action',async()=>{
 const records=[];
 const gate=createGate({history:[],record:async r=>records.push(r),request:editor(async()=>reply(issue('grammar'),issue('humor')))});
 await gate.review({text:'draft',wisdom:'draft'});
 assert.equal(records[0].kind,'editorial');assert.equal(records[0].nextAction,'repair');assert.match(records[0].sha256,/^[0-9a-f]{64}$/);
 assert.equal(records[0].verdict.blockers[0].category,'grammar');assert.equal(records[0].verdict.suggestions[0].category,'humor');
});
test('mixed structural and editorial failures share nine bounded submissions',async()=>{
 const records=[];
 const gate=createGate({history:[],record:async r=>records.push(r),request:editor(async()=>reply(issue('ai-slop')))});
 for(let i=0;i<9;i++) {
  const r=i%2?await gate.review({text:'draft',wisdom:'draft'}):await gate.reject({text:'invalid draft',issues:['Invalid format']});
  assert.equal(r.nextAction,i===8?'stop':i%3===2?'replace':'repair');
 }
 assert.deepEqual(records.map(r=>[r.story,r.revision]),[[1,0],[1,1],[1,2],[2,0],[2,1],[2,2],[3,0],[3,1],[3,2]]);
 await assert.rejects(gate.reject({text:'extra',issues:['bad']}),/terminal/);
});
test('structurally rejected subjects stay visible to the editor after replacement',async()=>{
 let context;
 const gate=createGate({history:[],request:editor(async m=>{context=JSON.parse(m[1].content);return reply();})});
 for(let i=0;i<3;i++) await gate.reject({text:'Overlong story about a lost alarm clock',issues:['Too long']});
 await gate.review({text:'Different verified story',wisdom:'different'});
 assert.equal(context.current.story,2);assert.match(context.abandonedStories[0]?.text||'',/alarm clock/);
});
test('strict reviewer schemas ask only for categorized, quoted issues without optional reasoning',()=>{
 assert.equal(verifierOptions.reasoning.enabled,false);assert.equal(verifierOptions.temperature,0);
 for(const options of [editorOptions,proofreaderOptions]) {
  const schema=options.responseFormat.json_schema.schema;
  assert.deepEqual(schema.required,['issues']);
  assert.deepEqual(schema.properties.issues.items.required,['category','quote','problem','fix']);
  assert.equal(options.temperature,0);assert.equal(options.reasoning.enabled,false);
 }
 assert.ok(editorOptions.responseFormat.json_schema.schema.properties.issues.items.properties.category.enum.includes('wrong-phrase'));
});
test('one empty or malformed reviewer answer is retried once before failing closed',async()=>{
 let editorCalls=0;
 const gate=createGate({history:[],request:editor(async()=>++editorCalls===1?{content:null}:reply())});
 assert.equal((await gate.review({text:'draft',wisdom:'draft'})).decision,'approve');assert.equal(editorCalls,2);
 let proofCalls=0;
 const failing=createGate({history:[],request:async(m,o)=>o===proofreaderOptions?(proofCalls++,{content:'{"issues":'}):o===verifierOptions?confirmAll(m):reply()});
 await assert.rejects(failing.review({text:'draft',wisdom:'draft'}),/JSON|Malformed/);assert.equal(proofCalls,2);
});
test('claimed blockers must survive an independent verifier; dismissed claims never block',async()=>{
 const seen=[];
 const gate=createGate({history:[{name:'h',text:'Опубликованный пост'}],request:async(m,o)=>{
  if(o===verifierOptions){const input=JSON.parse(m[1].content);seen.push(input);return {content:JSON.stringify({verdicts:[{id:0,real:true,category:'spelling',ground:'confirmed',reason:'Misspelling'},{id:1,real:false,category:'unsupported-claim',ground:'faithful-to-source',reason:'Faithful paraphrase'}]})};}
  return o===proofreaderOptions?reply(issue('spelling','поллуны','Hyphen')):reply(issue('unsupported-claim','назвали в честь Хлои','Middle name missing'),issue('humor','шутка','Could be sharper'));
 }});
 const r=await gate.review({text:'Кратер назвали в честь Хлои. Дыра в поллуны.',wisdom:'w',source:{primary:{url:'https://example.com',text:'Named for Chloe Angeline Stickney Hall'}}});
 assert.deepEqual(r.blockers.map(b=>b.quote),['поллуны']);assert.equal(r.dismissed[0].quote,'назвали в честь Хлои');assert.equal(r.dismissed[0].dismissal,'Faithful paraphrase');assert.equal(r.suggestions.length,1);
 assert.deepEqual(seen[0].claims.map(c=>[c.id,c.category]),[[0,'spelling'],[1,'unsupported-claim']]);
 assert.equal(seen[0].candidate,'Кратер назвали в честь Хлои. Дыра в поллуны.');assert.equal(seen[0].source.primary.text,'Named for Chloe Angeline Stickney Hall');assert.equal(seen[0].history.length,1);
});
test('a claim the verifier does not answer stays a blocker',async()=>{
 const gate=createGate({history:[],request:async(m,o)=>o===verifierOptions?{content:JSON.stringify({verdicts:[]})}:o===proofreaderOptions?reply():reply(issue('meaning','фраза','Contradiction'))});
 assert.equal((await gate.review({text:'фраза',wisdom:'w'})).decision,'revise');
});
test('no verifier call is made when nothing blocks, and host checks are never sent to it',async()=>{
 let verifications=0;
 const gate=createGate({history:[{text:'«Same wisdom!»'}],request:async(m,o)=>{if(o===verifierOptions)verifications++;return o===proofreaderOptions?reply():reply(issue('style','x','optional'));}});
 const r=await gate.review({text:'same wisdom',wisdom:'same wisdom'});
 assert.equal(verifications,0);assert.equal(r.decision,'replace');
});
test('verifier failure fails closed',async()=>{
 const gate=createGate({history:[],request:async(m,o)=>o===verifierOptions?{content:'not json'}:o===proofreaderOptions?reply():reply(issue('grammar','x','bad'))});
 await assert.rejects(gate.review({text:'x',wisdom:'x'}));
});
test('a loose weekday-category fit is a suggestion, not a blocker',async()=>{
 const gate=createGate({history:[],request:editor(async()=>reply(issue('category','NASA','Not a life hack')))});
 const r=await gate.review({text:'NASA story',wisdom:'w'});
 assert.equal(r.decision,'approve');assert.equal(r.suggestions[0].category,'category');
});
test('the verifier corrects a misrouted claim so an internal repeat is repaired, not replaced',async()=>{
 const gate=createGate({policy:'persistent-evening',history:[],request:async(m,o)=>o===verifierOptions?{content:JSON.stringify({verdicts:[{id:0,real:true,category:'meaning',ground:'confirmed',reason:'The same point is made twice inside the post'}]})}:o===proofreaderOptions?reply():reply(issue('repetition','всем миром','Repeats the Misha line'))});
 const r=await gate.review({text:'Строили всем миром. Строили всем миром.',wisdom:'w'});
 assert.equal(r.decision,'revise');assert.equal(r.nextAction,'repair');assert.equal(r.blockers[0].category,'meaning');assert.equal(r.blockers[0].claimed,'repetition');
 assert.deepEqual(verifierOptions.responseFormat.json_schema.schema.properties.verdicts.items.required,['id','real','category','ground','reason']);
});
test('the verifier may downgrade a replacement claim but never escalate a repair into a replacement',async()=>{
 const run=async(claimed,corrected)=>{const gate=createGate({policy:'persistent-evening',history:[],request:async(m,o)=>o===verifierOptions?{content:JSON.stringify({verdicts:[{id:0,real:true,category:corrected,ground:'confirmed',reason:'x'}]})}:o===proofreaderOptions?reply():reply(issue(claimed,'зачин','x'))});return gate.review({text:'зачин',wisdom:'w'});};
 const escalated=await run('ai-slop','repetition');assert.equal(escalated.nextAction,'repair');assert.equal(escalated.blockers[0].category,'ai-slop');
 const downgraded=await run('repetition','meaning');assert.equal(downgraded.nextAction,'repair');assert.equal(downgraded.blockers[0].category,'meaning');
 const kept=await run('unusable-source','repetition');assert.equal(kept.nextAction,'replace');
});
test('a language claim is dismissed only when the verifier says the text is correct as written',async()=>{
 const run=ground=>createGate({history:[],request:async(m,o)=>o===verifierOptions?{content:JSON.stringify({verdicts:[{id:0,real:false,category:'wrong-phrase',ground,reason:'x'}]})}:o===proofreaderOptions?reply(issue('wrong-phrase','меньше земной больше чем','Clashing')):reply()}).review({text:'меньше земной больше чем в тысячу раз',wisdom:'w'});
 assert.equal((await run('taste')).decision,'revise');
 assert.equal((await run('correct-as-written')).decision,'approve');
});
test('distinct empty-quote claims are verified separately and duplicate verdict ids fail closed',async()=>{
 let claims;
 const gate=createGate({history:[],request:async(m,o)=>{if(o===verifierOptions){claims=JSON.parse(m[1].content).claims;return confirmAll(m);}return o===proofreaderOptions?reply():reply(issue('meaning','','No story'),issue('meaning','','No verdict'));}});
 await gate.review({text:'x',wisdom:'w'});assert.equal(claims.length,2);
 const dup=createGate({history:[],request:async(m,o)=>o===verifierOptions?{content:JSON.stringify({verdicts:[{id:0,real:false,category:'meaning',ground:'taste',reason:'a'},{id:0,real:true,category:'meaning',ground:'confirmed',reason:'b'}]})}:o===proofreaderOptions?reply():reply(issue('meaning','x','bad'))});
 await assert.rejects(dup.review({text:'x',wisdom:'w'}),/Malformed/);
});
test('one transport failure of a reviewer is retried, a budget yield is not',async()=>{
 let editorCalls=0;
 const gate=createGate({history:[],request:editor(async()=>{if(++editorCalls===1)throw new Error('HTTP 502');return reply();})});
 assert.equal((await gate.review({text:'x',wisdom:'w'})).decision,'approve');assert.equal(editorCalls,2);
 let yields=0;
 const yielding=createGate({history:[],request:editor(async()=>{yields++;throw Object.assign(new Error('Checkpoint required'),{code:'YIELD'});})});
 await assert.rejects(yielding.review({text:'x',wisdom:'w'}),/Checkpoint/);assert.equal(yields,1);
});
test('a retried malformed answer is asked again with an explicit correction',async()=>{
 const seen=[];
 const gate=createGate({history:[],request:editor(async m=>{seen.push(m.length);return seen.length===1?{content:'{"issues":'}:reply();})});
 await gate.review({text:'x',wisdom:'w'});assert.deepEqual(seen,[2,3]);
});
test('a defect found independently by both the proofreader and the editor is not sent for dismissal',async()=>{
 let claims=null;
 const gate=createGate({history:[],request:async(m,o)=>{if(o===verifierOptions){claims=JSON.parse(m[1].content).claims;return {content:JSON.stringify({verdicts:claims.map(c=>({id:c.id,real:false,category:c.category,ground:'correct-as-written',reason:'x'}))})};}return reply(issue('spelling','поллуны','Hyphen'));}});
 const r=await gate.review({text:'Дыра в поллуны.',wisdom:'w'});
 assert.equal(r.decision,'revise');assert.equal(claims,null,'nothing left to verify');assert.equal(r.blockers[0].by,'proofreader+editor');
});
test('only quotes confined to host-printed lines are treated as host formatting',async()=>{
 const host=['Пиздато:','Мир ждёт твоего голоса: https://pizdato.net'];
 const run=quote=>createGate({history:[],request:editor(async()=>reply(issue('ai-slop',quote,'x')))}).review({text:'Весь мир смотрит.\n\nПиздато: хорошо.\n\nМир ждёт твоего голоса: https://pizdato.net',wisdom:'w',hostText:host});
 assert.equal((await run('Мир ждёт твоего голоса')).decision,'approve');
 assert.equal((await run('Пиздато')).decision,'approve');
 assert.equal((await run('мир')).decision,'revise','a word that also appears in the writer text still blocks');
});
