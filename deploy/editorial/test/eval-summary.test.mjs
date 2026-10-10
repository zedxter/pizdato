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
import {DEFAULT_BAR,barFor,fixtureFields,profilePaths,provenance,productionViolations} from '../eval-summary.mjs';
import {mkdtemp,mkdir,writeFile,readFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import channel from '../profiles/pizdato-channel.mjs';
import column from './profiles/example-column.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('the channel keeps its fixture paths, field mapping and bar',()=>{
 const p=profilePaths('pizdato-channel');
 assert.deepEqual(Object.fromEntries(Object.entries(p).map(([k,u])=>[k,fileURLToPath(u).split('/deploy/editorial/')[1]])),{module:'profiles/pizdato-channel.mjs',fixtures:'fixtures.json',heldout:'fixtures-heldout-222.json',heldoutSha256:'fixtures-heldout-222.sha256'});
 assert.deepEqual(fileURLToPath(profilePaths('column').fixtures).split('/deploy/editorial/')[1],'profiles/column/fixtures.json');
 assert.throws(()=>profilePaths('../x'),/profile id/);
 assert.deepEqual(fixtureFields(channel,{text:'t',wisdom:'w'}),{wisdom:'w'});assert.deepEqual(fixtureFields(channel,{text:'t'}),{wisdom:'t'});assert.deepEqual(fixtureFields(channel,{text:'t',wisdom:''}),{wisdom:'t'});
 assert.deepEqual(fixtureFields(column,{text:'t',fields:{title:'Заголовок'}}),{title:'Заголовок'});
 assert.deepEqual(barFor(channel),DEFAULT_BAR);assert.deepEqual(DEFAULT_BAR,{clean:1,objective:0.9});
 assert.deepEqual(barFor({...column,releaseBar:{objective:0.95}}),{clean:1,objective:0.95});
});
test('a profile bar may tighten the objective share but never loosen it',()=>{
 const objective=Array.from({length:10},(_,i)=>({id:`o${i}`,class:'objective'})),all=[{id:'c',class:'clean'},...objective];
 const results=[{id:'c',pass:true},...objective.map((f,i)=>({id:f.id,pass:i>0}))];
 assert.equal(summarize(all,all,results,{clean:1,objective:0.9}).releaseBar,true);
 assert.equal(summarize(all,all,results,{clean:1,objective:0.95}).releaseBar,false);
 assert.equal(summarize(all,all,results,{clean:1,objective:0.5}).releaseBar,true,'summarize never goes below the default');
 assert.deepEqual(barFor({...column,releaseBar:{objective:0.5}}),DEFAULT_BAR);
});
test('channel provenance records the profile and the da0b2ed rubric hashes of the released final run',async()=>{
 const p=await provenance(channel),final=JSON.parse(await readFile(new URL('../eval-runs/2026-10-10-final.json',import.meta.url),'utf8'));
 assert.equal(p.profile,'pizdato-channel');assert.match(p.profileSha256,/^[0-9a-f]{64}$/);
 assert.deepEqual(p.rubricSha256,final.rubricSha256);
 assert.equal(p.rubricSha256['editorial/editor.md'],'fe6646a1fa92e6ca6cc3c8e55799ddcc8329c6787ec5a48c985496cf0296f138');
});
test('every production profile but the channel needs fixtures and a passing final report',async()=>{
 assert.deepEqual(await productionViolations(),[]);
 const root=await mkdtemp(join(tmpdir(),'profiles-rule-'));
 try{
  const dir=join(root,'profiles');await mkdir(join(dir,'example-column'),{recursive:true});
  await copyFile(fileURLToPath(new URL('../profiles/pizdato-channel.mjs',import.meta.url)),join(dir,'pizdato-channel.mjs'));
  const module=join(dir,'example-column.mjs');await copyFile(fileURLToPath(new URL('./profiles/example-column.mjs',import.meta.url)),module);
  assert.match((await productionViolations(dir)).join('\n'),/example-column: no fixtures/);
  await writeFile(join(dir,'example-column/fixtures.json'),'[{"id":"c","class":"clean","text":"x","expected":"approve"}]');
  assert.match((await productionViolations(dir)).join('\n'),/example-column: no evaluation report/);
  const report=async r=>{await writeFile(join(dir,'example-column/report.json'),JSON.stringify(r));return (await productionViolations(dir)).join('\n');};
  const fixtures=join(dir,'example-column/fixtures.json'),heldoutSha256='a'.repeat(64);
  await writeFile(join(dir,'example-column/fixtures-heldout.sha256'),`${heldoutSha256}  fixtures-heldout.json\n`);
  const good={...await provenance(column,module),final:true,uncommitted:false,fixturesSha256:sha(await readFile(fixtures)),heldoutSha256,bar:DEFAULT_BAR,releaseBar:true};
  assert.equal(await report(good),'');
  // The report must describe the committed fixtures and the published held-out set it was measured on.
  assert.match(await report({...good,uncommitted:true}),/uncommitted/);
  assert.match(await report({...good,heldoutSha256:'b'.repeat(64)}),/held-out/);
  await writeFile(fixtures,'[{"id":"c","class":"clean","text":"y","expected":"approve"}]');
  assert.match(await report(good),/fixtures/);
  await writeFile(fixtures,'[{"id":"c","class":"clean","text":"x","expected":"approve"}]');assert.equal(await report(good),'');
  await rm(join(dir,'example-column/fixtures-heldout.sha256'));assert.match(await report(good),/held-out/);
  await writeFile(join(dir,'example-column/fixtures-heldout.sha256'),heldoutSha256);assert.equal(await report(good),'');
  // Fixture text in the profile's own composed rubrics fails the rule, for the dev and the revealed held-out set.
  await writeFile(fixtures,'[{"id":"c","class":"clean","text":"x","expected":"approve","injected":"Аркадий Петрович"}]');
  assert.match(await report({...good,fixturesSha256:sha(await readFile(fixtures))}),/example-column: fixture c is in editorial\/editor\.md/);
  await writeFile(fixtures,'[{"id":"c","class":"clean","text":"x","expected":"approve"}]');
  await writeFile(join(dir,'example-column/fixtures-heldout.json'),'[{"id":"h","class":"clean","text":"x","expected":"approve","injected":"Аркадий Петрович"}]');
  assert.match(await report(good),/fixture h is in/);
  await rm(join(dir,'example-column/fixtures-heldout.json'));
  assert.match(await report({...good,releaseBar:false}),/release bar/);
  assert.match(await report({...good,heldoutSha256:null}),/held-out/);
  assert.match(await report({...good,bar:{clean:1,objective:0.8}}),/bar/);
  assert.match(await report({...good,profileSha256:'0'.repeat(64)}),/stale/);
  assert.match(await report({...good,rubricSha256:{...good.rubricSha256,'editorial/editor.md':'0'.repeat(64)}}),/stale/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('eval.mjs runs a profile against a fake model and records its provenance and bar',async()=>{
 const {spawnSync}=await import('node:child_process');const {resolve}=await import('node:path');
 const root=await mkdtemp(join(tmpdir(),'eval-profile-'));
 try{
  // HOME points at an empty directory: the harness must not read real credentials or reach a real model.
  const env={PATH:process.env.PATH,HOME:root,OPENROUTER_API_KEY:'test',PIZDATO_EVAL_TRIALS:'1',TEST_TRACE:join(root,'trace'),TEST_VERDICT:'approve'};
  await writeFile(env.TEST_TRACE,'');
  const r=spawnSync(process.execPath,['--import',resolve('deploy/editorial/test/fake-network.mjs'),'deploy/editorial/eval.mjs',join(root,'report.json'),'agreement','--profile','pizdato-channel'],{encoding:'utf8',env,timeout:20000});
  assert.equal(r.status,1,r.stderr+r.stdout);assert.match(r.stdout,/FAIL agreement trial=1/);
  const report=JSON.parse(await readFile(join(root,'report.json'),'utf8'));
  assert.equal(report.profile,'pizdato-channel');assert.deepEqual(report.bar,DEFAULT_BAR);assert.deepEqual(report.rubricSha256,(await provenance(channel)).rubricSha256);
  assert.equal(report.releaseBar,null,'a subset run never claims the bar');
  const unknown=spawnSync(process.execPath,['--import',resolve('deploy/editorial/test/fake-network.mjs'),'deploy/editorial/eval.mjs',join(root,'other.json'),'--profile','no-such-profile'],{encoding:'utf8',env,timeout:20000});
  assert.notEqual(unknown.status,0);
 }finally{await rm(root,{recursive:true,force:true});}
});
