import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('evaluation can run one fixture trial at a time to respect provider rate limits',async()=>{
 const root=await mkdtemp(join(tmpdir(),'eval-scheduling-'));
 try {
  const preload=join(root,'network.mjs'),trace=join(root,'max');
  await writeFile(preload,`import {writeFileSync} from 'node:fs';let active=0,max=0;globalThis.fetch=async()=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,30));active--;writeFileSync(${JSON.stringify(trace)},String(max));return Response.json({choices:[{message:{content:JSON.stringify({issues:[]})}}]});};`);
  const r=spawnSync(process.execPath,['--import',preload,resolve('deploy/editorial/eval.mjs'),join(root,'report.json'),'coherent-exaggeration'],{encoding:'utf8',env:{...process.env,NOUS_API_KEY:'test',PIZDATO_EVAL_TRIALS:'3',PIZDATO_EVAL_CONCURRENCY:'1'},timeout:10000});
  assert.equal(r.status,0,r.stdout+r.stderr);
  // A single gate asks its proofreader and editor in parallel.
  assert.equal(Number(await readFile(trace,'utf8')),2);
 }finally{await rm(root,{recursive:true,force:true});}
});
