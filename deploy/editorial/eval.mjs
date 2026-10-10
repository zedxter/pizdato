// Non-publishing behavioral evaluation: no Composio connection or send path.
import {readFile,writeFile} from 'node:fs/promises';
import {loadEnv,chat,llmConfig} from '../evening/agent.mjs';
import {execFileSync} from 'node:child_process';
import {createGate} from './gate.mjs';
import {summarize} from './eval-summary.mjs';
import {homedir} from 'node:os';
import {join} from 'node:path';
await loadEnv(join(homedir(),'.config/pizdato-channel.env'));
await loadEnv(join(homedir(),'.config/pizdato-evening.env'));
const all=JSON.parse(await readFile(new URL('./fixtures.json',import.meta.url),'utf8'));
// Optional comma-separated fixture ids: tuning runs name the dev set and never the held-out sets.
const only=process.argv[3]?.split(',').filter(Boolean),unknown=(only||[]).filter(id=>!all.some(f=>f.id===id));
if(unknown.length) throw new Error(`Unknown fixture: ${unknown.join(', ')}`);
const fixtures=only?all.filter(f=>only.includes(f.id)):all;
const results=[];
const trials=Math.max(1,Number(process.env.PIZDATO_EVAL_TRIALS)||3);
const jobs=fixtures.flatMap(fixture=>Array.from({length:trials},(_,i)=>({fixture,trial:i+1})));
let next=0;
await Promise.all(Array.from({length:Math.min(6,jobs.length)},async()=>{
 while(next<jobs.length) {
 const {fixture,trial}=jobs[next++];
 try {
 const gate=createGate({request:(messages,options)=>chat(messages,undefined,{...options,model:process.env.PIZDATO_EDITOR_MODEL||undefined}),history:fixture.history||[]});
 const initial=fixture.initial?await gate.review({text:fixture.initial,wisdom:fixture.initial}):null;
 const verdict=await gate.review({text:fixture.text,wisdom:fixture.wisdom||fixture.text,source:fixture.source||null});
 // A defective fixture passes only when the kept blockers name its injected defect, not merely any defect.
 const caught=!fixture.expectedQuote||(verdict.blockers||[]).some(b=>new RegExp(fixture.expectedQuote,'iu').test(`${b.quote} ${b.problem}`));
 const pass=(!initial||(initial.decision==='revise'&&initial.nextAction==='repair')) && (fixture.expected==='reject'?verdict.decision!=='approve':verdict.decision===fixture.expected) && (!fixture.dimension || [].concat(fixture.dimension).some(d=>verdict[d]===false)) && caught;
 results.push({id:fixture.id,trial,pass,...(initial&&{initial}),verdict});
 console.log(`${pass?'PASS':'FAIL'} ${fixture.id} trial=${trial}${pass?'':` ${JSON.stringify(verdict)}`}`);
 } catch(error) {
 results.push({id:fixture.id,trial,pass:false,error:error.message});
 console.log(`ERROR ${fixture.id} trial=${trial}: ${error.message}`);
 }
 }
}));
const {base,dialect}=llmConfig();
let revision='unknown';try{revision=execFileSync('git',['rev-parse','HEAD'],{cwd:new URL('.',import.meta.url),encoding:'utf8'}).trim();}catch{}
const {byClass,bySet,releaseBar,misses}=summarize(all,fixtures,results);
const settings={revision,endpoint:base,dialect,byClass,bySet,releaseBar,misses,model:process.env.PIZDATO_EDITOR_MODEL||process.env.PIZDATO_EVENING_MODEL||'deepseek/deepseek-v4.1-flash',reviewerReasoningEffort:process.env.PIZDATO_EDITOR_REASONING_EFFORT||process.env.PIZDATO_REASONING_EFFORT||'low (reasoning models only)',temperature:0,trials,passed:results.filter(r=>r.pass).length,total:results.length};
console.log(JSON.stringify(settings));
await writeFile(process.argv[2]||'/tmp/pizdato-editorial-eval.json',JSON.stringify({...settings,at:new Date().toISOString(),results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
