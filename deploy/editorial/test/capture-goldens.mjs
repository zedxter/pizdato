// Captures channel goldens from the baseline release through its own API (editorial-profiles, design 7).
// Usage: node deploy/editorial/test/capture-goldens.mjs --baseline <worktree at da0b2ed> [--out <file>]
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {BASELINE,CASES,runCase,runPreflight} from './golden-cases.mjs';
export const RUBRICS=['editor.md','proofreader.md','verifier.md','writer.md'];
// The only deploy/ paths this change may touch; anything else means the baseline no longer describes main.
const OWN=[/^deploy\/editorial\//,/^deploy\/evening\/(agent|worker|network)\.mjs$/,/^deploy\/evening\/test\//,/^deploy\/morning\/agent\.mjs$/,/^deploy\/morning\/test\//];
export function provenance({head,dirty,gateSource,gateExports,changed}){
 if(head!==BASELINE)throw new Error(`Baseline worktree is at ${head}, expected ${BASELINE}`);
 if(dirty)throw new Error('Baseline worktree has local changes');
 if(/\bprofile\b/.test(gateSource)||gateExports.includes('reviewOptions'))throw new Error('Baseline gate accepts a profile; capture only from the pre-profile release');
 const foreign=changed.filter(p=>!OWN.some(r=>r.test(p)));
 if(foreign.length)throw new Error(`deploy/ changed outside this change since ${BASELINE}: ${foreign.join(', ')}; recapture from the new merge base`);
}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function capture(baseline){
 const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
 const here=dirname(fileURLToPath(import.meta.url)),gatePath=join(baseline,'deploy/editorial/gate.mjs');
 const gateSource=await readFile(gatePath,'utf8');
 const facts={head:git(baseline,'rev-parse','HEAD'),dirty:git(baseline,'status','--porcelain')!=='',gateSource,gateExports:[],changed:git(here,'diff','--name-only',BASELINE,'HEAD','--','deploy/').split('\n').filter(Boolean)};
 provenance(facts);
 const gate=await import(pathToFileURL(gatePath).href);facts.gateExports=Object.keys(gate);provenance(facts);
 const network=await import(pathToFileURL(join(baseline,'deploy/evening/network.mjs')).href),store=await import(pathToFileURL(join(baseline,'deploy/evening/store.mjs')).href);
 const rubricSha256=Object.fromEntries(await Promise.all(RUBRICS.map(async f=>[f,sha(await readFile(join(baseline,'deploy/editorial',f)))])));
 const cases=[];
 for(const c of CASES)cases.push({name:c.name,input:c.input,answers:c.answers,...await runCase(c,{createGate:o=>gate.createGate(o),review:(g,step)=>g.review(step)})});
 const preflight=await runPreflight({createServices:network.createServices,Budget:network.Budget,EditionStore:store.EditionStore});
 return {baseline:facts.head,rubricSha256,cases,preflight};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
 const baseline=arg('--baseline'),out=resolve(arg('--out')||fileURLToPath(new URL('./goldens/channel.json',import.meta.url)));
 if(!baseline){console.error('Usage: capture-goldens.mjs --baseline <worktree> [--out <file>]');process.exit(2);}
 capture(resolve(baseline)).then(async goldens=>{await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(goldens,null,1)+'\n');console.error(`GOLDENS ${out}: ${goldens.cases.length} cases, ${goldens.preflight.requests.length} preflight requests`);})
  .catch(error=>{console.error(`REFUSED: ${error.message}`);process.exitCode=1;});
}
