// Keeps evaluation fixtures out of everything a model is shown, so the evaluation measures rules, not memorized examples.
export const RUBRICS=['editorial/editor.md','editorial/proofreader.md','editorial/verifier.md','editorial/writer.md','evening/draft.md','evening/prompt.md','evening/legacy-prompt.md','morning/prompt.md'];
// The host prints these strings in every post; rubrics describe them, so they are not fixture text.
const HOST=['Пиздато:','Хуёво:','Мудрость дня:','Мир ждёт твоего голоса: https://pizdato.net'];
const normalize=text=>HOST.reduce((t,h)=>t.split(h).join(' '),String(text)).toLocaleLowerCase('ru').replace(/ё/g,'е');
const words=text=>normalize(text).match(/[а-я]+/g)||[];
export const grams=(text,n=4)=>{const w=words(text),out=new Set();for(let i=0;i+n<=w.length;i++)out.add(w.slice(i,i+n).join(' '));return out;};
const flat=text=>normalize(text).replace(/[^а-я0-9]+/g,' ').trim();
export function contamination(fixtures,rubrics){
 const findings=[];
 for(const [rubric,text] of Object.entries(rubrics)){
  const own=grams(text),plain=` ${flat(text)} `;
  for(const f of fixtures){
   const shared=[...grams(f.text)].find(g=>own.has(g));
   if(shared)findings.push({fixture:f.id,rubric,match:shared});
   else if(f.injected&&flat(f.injected)&&plain.includes(` ${flat(f.injected)} `))findings.push({fixture:f.id,rubric,match:f.injected});
   else if(f.expectedQuote&&new RegExp(f.expectedQuote,'iu').test(text))findings.push({fixture:f.id,rubric,match:f.expectedQuote});
  }
 }
 return findings;
}
// A held-out set must not share an article or a long passage with the fixtures that shaped the rubrics.
export function overlap(heldout,others,n=6){
 const urls=new Set(others.map(f=>f.source?.primary?.url).filter(Boolean)),seen=new Set(others.flatMap(f=>[...grams(f.text,n)]));
 return heldout.flatMap(f=>{const url=f.source?.primary?.url,g=[...grams(f.text,n)].find(x=>seen.has(x));return [...(urls.has(url)?[{fixture:f.id,match:url}]:[]),...(g?[{fixture:f.id,match:g}]:[])];});
}
