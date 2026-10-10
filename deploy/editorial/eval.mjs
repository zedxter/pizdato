// Non-publishing behavioral evaluation: no Composio connection or send path.
// Usage: node eval.mjs <report.json> [id,id,...] [--final] [--profile <id>] (default profile: pizdato-channel)
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadEnv,chat,llmConfig} from '../evening/agent.mjs';
import {execFileSync} from 'node:child_process';
import {createGate} from './gate.mjs';
import {summarize,passes,selectFixtures,verifySealed,profilePaths,fixtureFields,barFor,provenance,contaminationOf} from './eval-summary.mjs';
import {validateProfile} from './compose-rubric.mjs';
import {homedir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
await loadEnv(join(homedir(),'.config/pizdato-channel.env'));
await loadEnv(join(homedir(),'.config/pizdato-evening.env'));
const argv=process.argv.slice(2),at=argv.indexOf('--profile'),profileId=at<0?'pizdato-channel':argv[at+1];
const args=argv.filter((_,i)=>at<0||(i!==at&&i!==at+1)),final=args.includes('--final'),[report='/tmp/pizdato-editorial-eval.json',ids]=args.filter(a=>a!=='--final');
// Each profile is measured on its own fixtures, sealed held-out set and bar; the channel keeps its historical paths.
const paths=profilePaths(profileId),profile=(await import(paths.module.href)).default;
validateProfile(profile);
const here=new URL('.',import.meta.url),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixtureBytes=await readFile(paths.fixtures);
let all=JSON.parse(fixtureBytes),heldout=null;
// The sealed held-out set joins only a final run, and only byte-identical to its published hash.
if(final) {
 const bytes=await readFile(paths.heldout);
 heldout=verifySealed(bytes,await readFile(paths.heldoutSha256,'utf8'));
 all=[...all,...JSON.parse(bytes)];
}
// A profile whose rubrics show the model its own fixtures measures memory, not rules: refuse before any request.
const contaminated=await contaminationOf(profile,all);
if(contaminated.length){console.error(`Fixture text in rubrics of ${profile.id}: ${contaminated.map(f=>`${f.fixture} in ${f.rubric}`).join(', ')}`);process.exit(2);}
const fixtures=selectFixtures(all,ids?ids.split(',').filter(Boolean):null,final);
const results=[];
const trials=Math.max(1,Number(process.env.PIZDATO_EVAL_TRIALS)||3);
const jobs=fixtures.flatMap(fixture=>Array.from({length:trials},(_,i)=>({fixture,trial:i+1})));
let next=0;
await Promise.all(Array.from({length:Math.min(6,jobs.length)},async()=>{
 while(next<jobs.length) {
 const {fixture,trial}=jobs[next++];
 try {
 const gate=createGate({profile,request:(messages,options)=>chat(messages,undefined,{...options,model:process.env.PIZDATO_EDITOR_MODEL||undefined}),history:fixture.history||[]});
 const initial=fixture.initial?await gate.review({text:fixture.initial,fields:fixtureFields(profile,{text:fixture.initial})}):null;
 const verdict=await gate.review({text:fixture.text,fields:fixtureFields(profile,fixture),source:fixture.source||null});
 const pass=passes(fixture,verdict,initial);
 results.push({id:fixture.id,trial,pass,...(initial&&{initial}),verdict});
 console.log(`${pass?'PASS':'FAIL'} ${fixture.id} trial=${trial}${pass?'':` ${JSON.stringify(verdict)}`}`);
 } catch(error) {
 results.push({id:fixture.id,trial,pass:false,error:error.message});
 console.log(`ERROR ${fixture.id} trial=${trial}: ${error.message}`);
 }
 }
}));
const {base,dialect}=llmConfig();
const git=gitArgs=>{try{return execFileSync('git',gitArgs,{cwd:here,encoding:'utf8'}).trim();}catch{return null;}};
const origin=await provenance(profile,paths.module),bar=barFor(profile);
const perFixture=Object.fromEntries(fixtures.map(f=>{const r=results.filter(x=>x.id===f.id);return [f.id,{passed:r.filter(x=>x.pass).length,trials:r.length}];}));
const {byClass,bySet,releaseBar,misses}=summarize(all,fixtures,results,bar);
const settings={...origin,bar,revision:git(['rev-parse','HEAD'])||'unknown',uncommitted:git(['status','--porcelain'])!=='',final,selection:ids||'all',fixturesSha256:sha(fixtureBytes),heldoutSha256:heldout,endpoint:base,dialect,byClass,bySet,releaseBar,misses,perFixture,model:process.env.PIZDATO_EDITOR_MODEL||process.env.PIZDATO_EVENING_MODEL||'deepseek/deepseek-v4.1-flash',reviewerReasoningEffort:process.env.PIZDATO_EDITOR_REASONING_EFFORT||process.env.PIZDATO_REASONING_EFFORT||'low (reasoning models only)',temperature:0,trials,passed:results.filter(r=>r.pass).length,total:results.length};
console.log(JSON.stringify({...settings,perFixture:undefined,rubricSha256:undefined}));
await mkdir(dirname(resolve(report)),{recursive:true});
await writeFile(report,JSON.stringify({...settings,at:new Date().toISOString(),results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
