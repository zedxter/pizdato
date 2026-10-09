// Non-publishing behavioral evaluation: no Composio connection or send path.
import {readFile,writeFile} from 'node:fs/promises';
import {loadEnv,chat,llmConfig} from '../evening/agent.mjs';
import {execFileSync} from 'node:child_process';
import {createGate} from './gate.mjs';
import {homedir} from 'node:os';
import {join} from 'node:path';
await loadEnv(join(homedir(),'.config/pizdato-channel.env'));
await loadEnv(join(homedir(),'.config/pizdato-evening.env'));
const fixtures=JSON.parse(await readFile(new URL('./fixtures.json',import.meta.url),'utf8')).filter(f=>!process.argv[3]||f.id===process.argv[3]);
if(!fixtures.length) throw new Error('Unknown fixture');
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
// Release bar (editorial-convergence): no clean trial blocked, at least 90% of objective-defect trials caught; borderline cases are reported only.
const byClass=Object.fromEntries(['clean','objective','borderline'].map(c=>{const r=results.filter(r=>fixtures.find(f=>f.id===r.id)?.class===c);return [c,{passed:r.filter(x=>x.pass).length,total:r.length}];}));
const releaseBar=byClass.clean.passed===byClass.clean.total&&byClass.objective.passed>=Math.ceil(0.9*byClass.objective.total);
const settings={revision,endpoint:base,dialect,byClass,releaseBar,model:process.env.PIZDATO_EDITOR_MODEL||process.env.PIZDATO_EVENING_MODEL||'deepseek/deepseek-v4.1-flash',reviewerReasoningEffort:process.env.PIZDATO_EDITOR_REASONING_EFFORT||process.env.PIZDATO_REASONING_EFFORT||'low (reasoning models only)',temperature:0,trials,passed:results.filter(r=>r.pass).length,total:results.length};
console.log(JSON.stringify(settings));
await writeFile(process.argv[2]||'/tmp/pizdato-editorial-eval.json',JSON.stringify({...settings,at:new Date().toISOString(),results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
