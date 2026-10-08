import test from 'node:test';
import assert from 'node:assert/strict';
import {createGate, assertApproved} from '../gate.mjs';
const dimensions={grammar:true,meaning:true,freshness:true,voice:true,grounding:true};
const approve={decision:'approve',...dimensions,issues:[]};
test('rejected candidate cannot authorize delivery; a different candidate can', async()=>{
 const responses=[{...approve,decision:'revise',grammar:false,issues:['Wrong agreement']},approve];
 const gate=createGate({request:async()=>({content:JSON.stringify(responses.shift())}),history:[],record:async()=>{}});
 const bad=await gate.review({text:'Кофе остыла.',wisdom:'Кофе остыла.'});
 assert.throws(()=>assertApproved('Кофе остыла.',bad),/approval/i);
 const good=await gate.review({text:'Другой сюжет.',wisdom:'Другой сюжет.'});
 assert.doesNotThrow(()=>assertApproved('Другой сюжет.',good));
 assert.throws(()=>assertApproved('Changed text',good),/approval/i);
});
for(const [name,response] of Object.entries({malformed:'oops',missing:JSON.stringify({decision:'approve'}),contradictory:JSON.stringify({...approve,grammar:false}),unknown:JSON.stringify({...approve,extra:true})})) {
 test(`fails closed on ${name} editor response`,async()=>{
 const gate=createGate({request:async()=>({content:response}),history:[]});
 await assert.rejects(gate.review({text:'candidate',wisdom:'candidate'}));
 });
}
test('editor transport failure is fatal',async()=>{
 const gate=createGate({request:async()=>{throw new Error('timeout');},history:[]});
 await assert.rejects(gate.review({text:'candidate',wisdom:'candidate'}),/timeout/);
});
test('nine repairable rejections exhaust three subjects',async()=>{
 let calls=0;
 const gate=createGate({request:async()=>{calls++;return {content:JSON.stringify({...approve,decision:'revise',meaning:false,issues:['nonsense']})};},history:[]});
 for(let i=0;i<9;i++) await gate.review({text:`candidate ${i}`,wisdom:`candidate ${i}`});
 await assert.rejects(gate.review({text:'fourth',wisdom:'fourth'}),/budget/);
 assert.equal(calls,9);
});
test('normalized wisdom repetition cannot be approved even by a permissive editor',async()=>{
 const gate=createGate({request:async()=>({content:JSON.stringify(approve)}),history:[{text:'«Same wisdom!»'}]});
 const result=await gate.review({text:'same wisdom',wisdom:'same wisdom'});
 assert.equal(result.decision,'replace');
});
test('failed editor preserves rejected text locally without recording raw service errors',async()=>{
 const records=[];
 const gate=createGate({request:async()=>{throw new Error('sensitive remote detail');},history:[],record:async r=>records.push(r)});
 await assert.rejects(gate.review({text:'rejected draft',wisdom:'draft'}));
 assert.equal(records[0]?.text,'rejected draft');
 assert.equal(records[0]?.error,'Editorial review unavailable or invalid');
 assert.ok(!JSON.stringify(records).includes('sensitive'));
});
test('revise must identify a failed dimension',async()=>{
 const gate=createGate({request:async()=>({content:JSON.stringify({...approve,decision:'revise',issues:['something']})}),history:[]});
 await assert.rejects(gate.review({text:'candidate',wisdom:'candidate'}),/Contradictory/);
});
test('unquoted evening wisdom cannot be recycled',async()=>{
 const gate=createGate({request:async()=>({content:JSON.stringify(approve)}),history:[{text:'Мудрость дня: Same wisdom!\nCTA'}]});
 assert.equal((await gate.review({text:'same wisdom',wisdom:'same wisdom'})).decision,'replace');
});
test('replacement editor sees rejected candidates so cosmetic rewrites cannot hide',async()=>{
 const prompts=[];
 const gate=createGate({request:async messages=>{prompts.push(JSON.parse(messages[1].content));return {content:JSON.stringify({...approve,decision:'revise',freshness:false,issues:['Pick another premise']})};},history:[]});
 await gate.review({text:'first failed premise',wisdom:'first'});
 await gate.review({text:'second premise',wisdom:'second'});
 assert.equal(prompts[1].rejectedCandidates[0].text,'first failed premise');
});

test('repair keeps subject and labels earlier revisions for a full new review',async()=>{
 const prompts=[],records=[];
 const replies=[{...approve,decision:'revise',grammar:false,issues:['Wrong agreement']},{...approve,decision:'revise',grounding:false,issues:['New unsupported detail']},approve];
 const gate=createGate({history:[],request:async m=>{prompts.push(JSON.parse(m[1].content));return {content:JSON.stringify(replies.shift())};},record:async r=>records.push(r)});
 assert.equal((await gate.review({text:'original',wisdom:'original'})).nextAction,'repair');
 assert.equal((await gate.review({text:'grammar fixed but unsupported',wisdom:'changed'})).nextAction,'repair');
 const approved=await gate.review({text:'fully fixed',wisdom:'fixed'});
 assertApproved('fully fixed',approved);
 assert.deepEqual(records.map(r=>[r.story,r.revision]),[[1,0],[1,1],[1,2]]);
 assert.equal(prompts[2].current.story,1);
 assert.equal(prompts[2].rejectedCandidates[0].story,1);
 await assert.rejects(gate.review({text:'extra',wisdom:'extra'}),/terminal|budget/i);
});

test('freshness takes priority over grammar and exhausts after three subjects',async()=>{
 const gate=createGate({history:[],request:async()=>({content:JSON.stringify({...approve,decision:'revise',grammar:false,freshness:false,issues:['Repeated subject and agreement']})})});
 for(const expected of ['replace','replace','stop']) assert.equal((await gate.review({text:'repeated',wisdom:'repeated'})).nextAction,expected);
 await assert.rejects(gate.review({text:'extra',wisdom:'extra'}),/terminal/);
});
test('unusable source replaces immediately while a removable overstatement permits repair',async()=>{
 const replies=[{...approve,decision:'revise',grounding:false,issues:['Missing caveat']},{...approve,decision:'replace',grounding:false,issues:['Evidence cannot support the story']}];
 const gate=createGate({history:[],request:async()=>({content:JSON.stringify(replies.shift())})});
 assert.equal((await gate.review({text:'first',wisdom:'first'})).nextAction,'repair');
 assert.equal((await gate.review({text:'second',wisdom:'second'})).nextAction,'replace');
 assert.deepEqual(gate.state,{story:2,revision:0,done:false});
});
test('mixed structural and editorial failures share nine submissions',async()=>{
 const records=[];
 const gate=createGate({history:[],record:async r=>records.push(r),request:async()=>({content:JSON.stringify({...approve,decision:'revise',voice:false,issues:['Weak joke']})})});
 for(let i=0;i<9;i++) {
 const r=i%2?await gate.review({text:'draft',wisdom:'draft'}):await gate.reject({text:'invalid draft',issues:['Invalid format']});
 assert.equal(r.nextAction,i===8?'stop':i%3===2?'replace':'repair');
 }
 assert.deepEqual(records.map(r=>[r.story,r.revision]),[[1,0],[1,1],[1,2],[2,0],[2,1],[2,2],[3,0],[3,1],[3,2]]);
 await assert.rejects(gate.reject({text:'extra',issues:['bad']}),/terminal/);
});
test('editor failure terminates even if a caller tries another review',async()=>{
 const gate=createGate({history:[],request:async()=>{throw new Error('timeout');}});
 await assert.rejects(gate.review({text:'draft',wisdom:'draft'}),/timeout/);
 await assert.rejects(gate.review({text:'retry',wisdom:'retry'}),/terminal/);
});
test('replace for grammar alone is contradictory and cannot advance the budget',async()=>{
 const gate=createGate({history:[],request:async()=>({content:JSON.stringify({...approve,decision:'replace',grammar:false,issues:['Agreement']})})});
 await assert.rejects(gate.review({text:'draft',wisdom:'draft'}),/Contradictory/);
 assert.equal(gate.state.done,true);
});

test('structurally rejected subjects remain visible after replacement',async()=>{
 let context;
 const gate=createGate({history:[],request:async m=>{context=JSON.parse(m[1].content);return {content:JSON.stringify(approve)};}});
 for(let i=0;i<3;i++) await gate.reject({text:'Overlong story about a lost alarm clock',issues:['Too long']});
 await gate.review({text:'Different verified story',wisdom:'different'});
 assert.equal(context.current.story,2);
 assert.equal(context.rejectedCandidates[0]?.story,1);
 assert.match(context.rejectedCandidates[0]?.text||'',/alarm clock/);
});
