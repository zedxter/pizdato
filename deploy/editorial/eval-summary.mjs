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
