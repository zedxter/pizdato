import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('installer produces importable coherent bundle and a verifiable manifest',async()=>{
 const root=await mkdtemp(join(tmpdir(),'editorial-install-'));
 try {
 const result=spawnSync('python3',['deploy/editorial/install.py','--share',join(root,'share'),'--state',join(root,'state')],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 for(const slot of ['morning','evening']) {
 const check=spawnSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(join(root,'share',`pizdato-${slot}/agent.mjs`))})`],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
 }
 const manifest=JSON.parse(await readFile(join(JSON.parse(result.stdout).release,'manifest.json'),'utf8'));
 await mkdir(join(root,'vault/posts'),{recursive:true});await writeFile(join(root,'trace'),'');
 for(const slot of ['morning','evening']) {
 const prefix=`PIZDATO_${slot.toUpperCase()}`;
 const dry=spawnSync('bash',[join(root,'share',`pizdato-${slot}/run.sh`),'--dry-run'],{encoding:'utf8',env:{...process.env,NODE_OPTIONS:`--import ${resolve('deploy/editorial/test/fake-network.mjs')}`,OPENROUTER_API_KEY:'test',COMPOSIO_CONSUMER_KEY:'test',PIZDATO_CHANNEL_ENV:join(root,'missing'),PIZDATO_EVENING_ENV:join(root,'missing'),[`${prefix}_NODE`]:process.execPath,[`${prefix}_VAULT`]:join(root,'vault'),[`${prefix}_STATE`]:join(root,'state',slot),TEST_TRACE:join(root,'trace'),TEST_VERDICT:'approve'}});
 assert.equal(dry.status,0,dry.stderr);assert.ok(dry.stdout.includes('DRY_RUN_OK'),dry.stdout);
 }
 assert.ok(manifest.sha256['editorial/editor.md']);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('schedule migration changes only evening entry and saves cron and journals',async()=>{
 const root=await mkdtemp(join(tmpdir(),'evening-schedule-'));
 try{
  await mkdir(join(root,'bin'));const cron=join(root,'cron');await writeFile(cron,'0 10 * * * morning # pizdato-morning\n0 18 * * * old # pizdato-evening\n');
  await writeFile(join(root,'bin/crontab'),'#!/bin/sh\nif [ "$1" = -l ]; then cat "$TEST_CRON"; else cp "$1" "$TEST_CRON"; fi\n',{mode:0o700});
  await writeFile(join(root,'bin/node-wrapper'),'#!/bin/sh\nprintf used > "$TEST_NODE_TRACE"\nexec "$TEST_NODE_BINARY" "$@"\n',{mode:0o700});
  const r=spawnSync('python3',['deploy/editorial/install.py','--share',join(root,'share'),'--state',join(root,'state'),'--schedule'],{encoding:'utf8',env:{...process.env,PATH:join(root,'bin')+':'+process.env.PATH,TEST_CRON:cron,PIZDATO_EVENING_NODE:join(root,'bin/node-wrapper'),TEST_NODE_TRACE:join(root,'node-used'),TEST_NODE_BINARY:process.execPath}});
  assert.equal(r.status,0,r.stderr);const updated=await readFile(cron,'utf8');assert.match(updated,/^0 10 \* \* \* morning # pizdato-morning/m);assert.match(updated,/^\*\/5 \* \* \* \* .*tick.sh/m);
  const config=JSON.parse(await readFile(join(root,'state/pizdato-evening/scheduler.json'),'utf8'));assert.equal(config.version,1);assert.equal(await readFile(join(root,'node-used'),'utf8'),'used');
  const backup=JSON.parse(r.stdout).backup;assert.match(await readFile(join(backup,'crontab.txt'),'utf8'),/old # pizdato-evening/);
 }finally{await rm(root,{recursive:true,force:true});}
});
