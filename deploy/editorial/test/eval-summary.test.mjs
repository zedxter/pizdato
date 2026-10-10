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
import {passes,selectFixtures,verifySealed} from '../eval-summary.mjs';
import {createHash} from 'node:crypto';

const misattribution={id:'m',expected:'revise',class:'objective',categories:['misattribution'],expectedQuote:'кучу денег'};
const verdict=(...blockers)=>({decision:'revise',blockers});
test('a defect counts only when one blocker both quotes it and has an expected category',()=>{
 assert.equal(passes(misattribution,verdict({category:'misattribution',quote:'Дядя Миша сказал: «отдашь кучу денег»'})),true);
 assert.equal(passes(misattribution,verdict({category:'ai-slop',quote:'Дядя Миша сказал: «отдашь кучу денег»'})),false,'right span, wrong category');
 assert.equal(passes(misattribution,verdict({category:'ai-slop',quote:'отдашь кучу денег'},{category:'misattribution',quote:'Дядя Миша сказал'})),false,'span and category on different blockers');
 assert.equal(passes(misattribution,verdict({category:'misattribution',quote:'Дядя Миша сказал',problem:'Это слова Брауна про кучу денег'})),false,'a match in the problem text is not a quote');
 assert.equal(passes(misattribution,{decision:'approve',blockers:[]}),false);
});
test('older fixtures derive their categories from the dimension',()=>{
 const old={id:'o',expected:'revise',class:'objective',dimension:['grounding'],expectedQuote:'правдоподобн'};
 assert.equal(passes(old,verdict({category:'unsupported-claim',quote:'«Мы хотим правдоподобные планы»'})),true);
 assert.equal(passes(old,verdict({category:'misattribution',quote:'«Мы хотим правдоподобные планы»'})),true);
 assert.equal(passes(old,verdict({category:'ai-slop',quote:'«Мы хотим правдоподобные планы»'})),false);
 assert.equal(passes({id:'c',expected:'approve',class:'clean'},{decision:'approve',blockers:[]}),true);
 assert.equal(passes({id:'r',expected:'replace',class:'objective',dimension:'freshness'},{decision:'replace',blockers:[{category:'repetition',quote:''}]}),true);
});
test('held-out fixtures run only in a final run and only from the published file',()=>{
 const all=[{id:'a'},{id:'h',set:'held-out-222'}];
 assert.deepEqual(selectFixtures(all,null,false).map(f=>f.id),['a'],'a plain run leaves held-out fixtures out');
 assert.throws(()=>selectFixtures(all,['h'],false),/--final/);
 assert.deepEqual(selectFixtures(all,['h'],true).map(f=>f.id),['h']);
 assert.throws(()=>selectFixtures(all,['x'],true),/Unknown fixture: x/);
 const bytes=Buffer.from('[{"id":"h"}]'),hash=createHash('sha256').update(bytes).digest('hex');
 assert.doesNotThrow(()=>verifySealed(bytes,`${hash}  fixtures-heldout-222.json\n`));
 assert.throws(()=>verifySealed(Buffer.from('[{"id":"h2"}]'),hash),/does not match/);
});
