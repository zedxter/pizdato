import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {guardedTexts,contamination} from './fixture-guard.mjs';
// Release bar (editorial-convergence): no clean trial blocked and at least 90% of objective-defect trials caught.
// Borderline fixtures are reported only; held-out sets are reported separately; a subset run never claims the bar.
export const DEFAULT_BAR=Object.freeze({clean:1,objective:0.9});
// A profile may tighten the objective share but never loosen the channel's bar.
export const barFor=profile=>({clean:1,objective:Math.max(DEFAULT_BAR.objective,profile.releaseBar?.objective??0)});
export function summarize(all,ran,results,bar=DEFAULT_BAR){
 const of=id=>ran.find(f=>f.id===id)||{};
 const tally=pred=>{const r=results.filter(x=>pred(of(x.id)));return {passed:r.filter(x=>x.pass).length,total:r.length};};
 const byClass=Object.fromEntries(['clean','objective','borderline'].map(c=>[c,tally(f=>f.class===c)]));
 const sets=[...new Set(ran.map(f=>f.set).filter(Boolean))];
 const bySet=Object.fromEntries(sets.map(s=>[s,{clean:tally(f=>f.set===s&&f.class==='clean'),objective:tally(f=>f.set===s&&f.class==='objective')}]));
 const complete=all.every(f=>ran.some(r=>r.id===f.id));
 const releaseBar=complete?byClass.clean.passed===byClass.clean.total&&byClass.objective.passed>=Math.ceil(Math.max(DEFAULT_BAR.objective,bar.objective)*byClass.objective.total):null;
 return {byClass,bySet,releaseBar,misses:[...new Set(results.filter(r=>!r.pass).map(r=>r.id))]};
}
// Fixtures written before categories were recorded name the verdict dimension instead.
const BY_DIMENSION={grammar:['spelling','grammar','punctuation','wrong-phrase'],meaning:['meaning'],grounding:['unsupported-claim','unusable-source','misattribution'],voice:['ai-slop'],freshness:['repetition']};
const expectedCategories=f=>f.categories||(f.dimension?[].concat(f.dimension).flatMap(d=>BY_DIMENSION[d]||[]):null);
// A defect counts only when one kept blocker both quotes it and files it under an expected category.
export function passes(fixture,verdict,initial=null){
 if(initial&&!(initial.decision==='revise'&&initial.nextAction==='repair'))return false;
 const decided=fixture.expected==='reject'?verdict.decision!=='approve':verdict.decision===fixture.expected;
 if(!decided)return false;
 if(fixture.expected==='approve')return true;
 const categories=expectedCategories(fixture),quote=fixture.expectedQuote&&new RegExp(fixture.expectedQuote,'iu');
 return (verdict.blockers||[]).some(b=>(!quote||quote.test(b.quote||''))&&(!categories||categories.includes(b.category)));
}
// Held-out fixtures are loaded only for a final run; naming one elsewhere is refused.
export function selectFixtures(all,ids,final){
 if(!ids)return all.filter(f=>final||!f.set?.startsWith('held-out'));
 const unknown=ids.filter(id=>!all.some(f=>f.id===id));
 if(unknown.length)throw new Error(`Unknown fixture: ${unknown.join(', ')}`);
 const chosen=all.filter(f=>ids.includes(f.id));
 if(!final&&chosen.some(f=>f.set?.startsWith('held-out')))throw new Error('Held-out fixtures run only with --final');
 return chosen;
}
export function verifySealed(bytes,published){
 const hash=createHash('sha256').update(bytes).digest('hex'),expected=String(published).trim().split(/\s+/)[0];
 if(hash!==expected)throw new Error(`Held-out file ${hash} does not match the published hash ${expected}`);
 return hash;
}
// The channel keeps its historical fixture paths; every other profile keeps its own under profiles/<id>/.
export function profilePaths(id){
 if(!/^[a-z0-9][a-z0-9-]*$/.test(id))throw new Error(`Invalid profile id: ${id}`);
 const at=path=>new URL(path,import.meta.url);
 if(id==='pizdato-channel')return {module:at('./profiles/pizdato-channel.mjs'),fixtures:at('./fixtures.json'),heldout:at('./fixtures-heldout-222.json'),heldoutSha256:at('./fixtures-heldout-222.sha256')};
 return {module:at(`./profiles/${id}.mjs`),fixtures:at(`./profiles/${id}/fixtures.json`),heldout:at(`./profiles/${id}/fixtures-heldout.json`),heldoutSha256:at(`./profiles/${id}/fixtures-heldout.sha256`)};
}
// Fixture inputs fill the profile's fields; the channel keeps wisdom: fixture.wisdom || fixture.text.
export const fixtureFields=(profile,fixture)=>Object.fromEntries(profile.fields.map(k=>[k,fixture.fields?.[k]||fixture[k]||fixture.text]));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
// A report names the profile module and the exact composed rubrics it measured.
export async function provenance(profile,module=profilePaths(profile.id).module){
 const texts=await guardedTexts(profile);
 return {profile:profile.id,profileSha256:sha(await readFile(module)),rubricSha256:Object.fromEntries(Object.entries(texts).map(([k,t])=>[k,sha(t)]))};
}
// No fixture sentence, injected span or expected quote may reach what the profile's model is shown, with its own host lines.
export const contaminationOf=async(profile,fixtures)=>contamination(fixtures,await guardedTexts(profile),profile.hostLines??[]);
// Production rule: a publication ships only with fixtures and a passing final report on its current profile, rubrics,
// committed fixtures and published held-out set, and with no fixture text in its composed rubrics.
export async function productionViolations(dir=fileURLToPath(new URL('./profiles/',import.meta.url))){
 const out=[];
 for(const name of (await readdir(dir)).filter(n=>n.endsWith('.mjs')).sort()){
  const id=name.slice(0,-4),own=join(dir,id);
  if(id==='pizdato-channel')continue;
  const bytes=async file=>{try{return await readFile(join(own,file));}catch{return null;}},json=async file=>{try{return JSON.parse(await bytes(file));}catch{return null;}};
  const fixtures=await json('fixtures.json');
  if(!Array.isArray(fixtures)||!fixtures.length){out.push(`${id}: no fixtures`);continue;}
  const published=String(await bytes('fixtures-heldout.sha256')||'').trim().split(/\s+/)[0],heldout=await json('fixtures-heldout.json');
  const report=await json('report.json');
  if(!report){out.push(`${id}: no evaluation report`);continue;}
  const profile=(await import(pathToFileURL(join(dir,name)).href)).default;
  const current=await provenance(profile,join(dir,name));
  if(profile.id!==id||report.profile!==id||report.profileSha256!==current.profileSha256||JSON.stringify(report.rubricSha256)!==JSON.stringify(current.rubricSha256))out.push(`${id}: the report is stale for the current profile or rubrics`);
  if(!(report.bar?.clean>=DEFAULT_BAR.clean&&report.bar?.objective>=DEFAULT_BAR.objective))out.push(`${id}: the report bar is looser than the default bar`);
  if(report.final!==true||!report.heldoutSha256||report.heldoutSha256!==published)out.push(`${id}: the report has no sealed held-out set matching fixtures-heldout.sha256`);
  if(report.fixturesSha256!==sha(await bytes('fixtures.json')))out.push(`${id}: the report was measured on other fixtures`);
  if(report.uncommitted!==false)out.push(`${id}: the report was run from an uncommitted tree`);
  for(const f of await contaminationOf(profile,[...fixtures,...(Array.isArray(heldout)?heldout:[])]))out.push(`${id}: fixture ${f.fixture} is in ${f.rubric} («${f.match}»)`);
  if(report.releaseBar!==true)out.push(`${id}: the report does not meet its release bar`);
 }
 return out;
}
