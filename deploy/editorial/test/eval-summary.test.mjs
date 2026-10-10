import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize} from '../eval-summary.mjs';

const fixtures=[{id:'c1',class:'clean'},{id:'o1',class:'objective'},{id:'h1',class:'objective',set:'held-out-222'},{id:'h2',class:'clean',set:'held-out-222'},{id:'b1',class:'borderline'}];
const run=(id,pass)=>({id,pass});
test('a full run reports classes, sets, misses and the release bar',()=>{
 const s=summarize(fixtures,fixtures,[run('c1',true),run('o1',true),run('h1',false),run('h2',true),run('b1',false)]);
 assert.deepEqual(s.byClass,{clean:{passed:2,total:2},objective:{passed:1,total:2},borderline:{passed:0,total:1}});
 assert.deepEqual(s.bySet,{'held-out-222':{clean:{passed:1,total:1},objective:{passed:0,total:1}}});
 assert.deepEqual(s.misses,['h1','b1']);
 assert.equal(s.releaseBar,false);
});
test('the bar needs every clean trial and 90% of objective trials',()=>{
 const objective=Array.from({length:10},(_,i)=>({id:`o${i}`,class:'objective'})),all=[{id:'c',class:'clean'},...objective];
 const results=[run('c',true),...objective.map((f,i)=>run(f.id,i>0))];
 assert.equal(summarize(all,all,results).releaseBar,true);
 assert.equal(summarize(all,all,[run('c',false),...results.slice(1)]).releaseBar,false);
});
test('a subset run never claims the release bar',()=>{
 assert.equal(summarize(fixtures,fixtures.slice(0,2),[run('c1',true),run('o1',true)]).releaseBar,null);
});
