// Keeps evaluation fixtures out of everything a model is shown, so the evaluation measures rules, not memorized examples.
export const RUBRICS=['editorial/editor.md','editorial/proofreader.md','editorial/verifier.md','editorial/writer.md','evening/draft.md','evening/prompt.md','evening/legacy-prompt.md','morning/prompt.md'];
// Host-printed lines appear in every post and every prompt that describes the format.
const HOST=['Мир ждёт твоего голоса: https://pizdato.net'];
const words=text=>text.toLocaleLowerCase('ru').replace(/ё/g,'е').match(/[а-я]+/g)||[];
const grams=(text,n=4)=>{const w=words(text),out=new Set();for(let i=0;i+n<=w.length;i++)out.add(w.slice(i,i+n).join(' '));return out;};
const host=new Set(HOST.flatMap(line=>[...grams(line)]));
export function contamination(fixtures,rubrics){
 const findings=[];
 for(const [rubric,text] of Object.entries(rubrics)){
  const own=grams(text);
  for(const f of fixtures){
   const shared=[...grams(f.text)].find(g=>own.has(g)&&!host.has(g));
   if(shared)findings.push({fixture:f.id,rubric,match:shared});
   else if(f.expectedQuote&&new RegExp(f.expectedQuote,'iu').test(text))findings.push({fixture:f.id,rubric,match:f.expectedQuote});
  }
 }
 return findings;
}
