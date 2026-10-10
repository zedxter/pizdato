import {readFile} from 'node:fs/promises';
import {composeRubric,TEMPLATES} from './compose-rubric.mjs';
// Keeps evaluation fixtures out of everything a model is shown, so the evaluation measures rules, not memorized examples.
// The prompts the channel's callers add around the composed rubrics; other profiles have none yet.
const CALLER_PROMPTS={'pizdato-channel':['evening/draft.md','evening/prompt.md','evening/legacy-prompt.md','morning/prompt.md']};
// The guard reads what a model is sent: the profile's composed rubrics, never the templates.
export async function guardedTexts(profile){
 const prompts=await Promise.all((CALLER_PROMPTS[profile.id]||[]).map(async path=>[path,await readFile(new URL(`../${path}`,import.meta.url),'utf8')]));
 return Object.fromEntries([...TEMPLATES.map(name=>[`editorial/${name}.md`,composeRubric(name,profile)]),...prompts]);
}
// The host prints these strings in every post; rubrics describe them, so they are not fixture text. Every caller passes
// its profile's lines (or []): another publication's labels are fixture text, never a silent channel default.
const lines=host=>{if(!Array.isArray(host))throw new Error('Fixture guard needs the profile host lines');return host;};
const normalize=(text,host)=>host.reduce((t,h)=>t.split(h).join(' '),String(text)).toLocaleLowerCase('ru').replace(/ё/g,'е');
const words=(text,host)=>normalize(text,host).match(/[а-я]+/g)||[];
export const grams=(text,n,host)=>{const w=words(text,lines(host)),out=new Set();for(let i=0;i+n<=w.length;i++)out.add(w.slice(i,i+n).join(' '));return out;};
const flat=(text,host)=>normalize(text,host).replace(/[^а-я0-9]+/g,' ').trim();
export function contamination(fixtures,rubrics,host){
 lines(host);const findings=[];
 for(const [rubric,text] of Object.entries(rubrics)){
  const own=grams(text,4,host),plain=` ${flat(text,host)} `;
  for(const f of fixtures){
   const shared=[...grams(f.text,4,host)].find(g=>own.has(g));
   if(shared)findings.push({fixture:f.id,rubric,match:shared});
   else if(f.injected&&flat(f.injected,host)&&plain.includes(` ${flat(f.injected,host)} `))findings.push({fixture:f.id,rubric,match:f.injected});
   else if(f.expectedQuote&&new RegExp(f.expectedQuote,'iu').test(text))findings.push({fixture:f.id,rubric,match:f.expectedQuote});
  }
 }
 return findings;
}
// A held-out set must not share an article or a long passage with the fixtures that shaped the rubrics.
export function overlap(heldout,others,host,n=6){
 lines(host);const urls=new Set(others.map(f=>f.source?.primary?.url).filter(Boolean)),seen=new Set(others.flatMap(f=>[...grams(f.text,n,host)]));
 return heldout.flatMap(f=>{const url=f.source?.primary?.url,g=[...grams(f.text,n,host)].find(x=>seen.has(x));return [...(urls.has(url)?[{fixture:f.id,match:url}]:[]),...(g?[{fixture:f.id,match:g}]:[])];});
}
