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
test('three rejections exhaust candidate budget',async()=>{
 let calls=0;
 const gate=createGate({request:async()=>{calls++;return {content:JSON.stringify({...approve,decision:'revise',meaning:false,issues:['nonsense']})};},history:[]});
 for(let i=0;i<3;i++) await gate.review({text:`candidate ${i}`,wisdom:`candidate ${i}`});
 await assert.rejects(gate.review({text:'fourth',wisdom:'fourth'}),/budget/);
 assert.equal(calls,3);
});
test('normalized wisdom repetition cannot be approved even by a permissive editor',async()=>{
 const gate=createGate({request:async()=>({content:JSON.stringify(approve)}),history:[{text:'«Same wisdom!»'}]});
 const result=await gate.review({text:'same wisdom',wisdom:'same wisdom'});
 assert.equal(result.decision,'revise');
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
 assert.equal((await gate.review({text:'same wisdom',wisdom:'same wisdom'})).decision,'revise');
});
test('replacement editor sees rejected candidates so cosmetic rewrites cannot hide',async()=>{
 const prompts=[];
 const gate=createGate({request:async messages=>{prompts.push(JSON.parse(messages[1].content));return {content:JSON.stringify({...approve,decision:'revise',freshness:false,issues:['Pick another premise']})};},history:[]});
 await gate.review({text:'first failed premise',wisdom:'first'});
 await gate.review({text:'second premise',wisdom:'second'});
 assert.equal(prompts[1].rejectedCandidates[0].text,'first failed premise');
});
