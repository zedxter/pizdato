// Release bar (editorial-convergence): no clean trial blocked and at least 90% of objective-defect trials caught.
// Borderline fixtures are reported only; held-out sets are reported separately; a subset run never claims the bar.
export function summarize(all,ran,results){
 const of=id=>ran.find(f=>f.id===id)||{};
 const tally=pred=>{const r=results.filter(x=>pred(of(x.id)));return {passed:r.filter(x=>x.pass).length,total:r.length};};
 const byClass=Object.fromEntries(['clean','objective','borderline'].map(c=>[c,tally(f=>f.class===c)]));
 const sets=[...new Set(ran.map(f=>f.set).filter(Boolean))];
 const bySet=Object.fromEntries(sets.map(s=>[s,{clean:tally(f=>f.set===s&&f.class==='clean'),objective:tally(f=>f.set===s&&f.class==='objective')}]));
 const complete=all.every(f=>ran.some(r=>r.id===f.id));
 const releaseBar=complete?byClass.clean.passed===byClass.clean.total&&byClass.objective.passed>=Math.ceil(0.9*byClass.objective.total):null;
 return {byClass,bySet,releaseBar,misses:[...new Set(results.filter(r=>!r.pass).map(r=>r.id))]};
}
import {createHash} from 'node:crypto';
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
