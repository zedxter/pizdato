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
 const dry=spawnSync('bash',[join(root,'share',`pizdato-${slot}/run.sh`),'--dry-run'],{encoding:'utf8',env:{...process.env,NODE_OPTIONS:`--import ${resolve('deploy/editorial/test/fake-network.mjs')}`,OPENROUTER_API_KEY:'test',COMPOSIO_CONSUMER_KEY:'test',PIZDATO_CHANNEL_ENV:join(root,'missing'),PIZDATO_EVENING_ENV:join(root,'missing'),[`${prefix}_VAULT`]:join(root,'vault'),[`${prefix}_STATE`]:join(root,'state',slot),TEST_TRACE:join(root,'trace'),TEST_VERDICT:'approve'}});
 assert.equal(dry.status,0,dry.stderr);assert.ok(dry.stdout.includes('DRY_RUN_OK'),dry.stdout);
 }
 assert.ok(manifest.sha256['editorial/editor.md']);
 }finally{await rm(root,{recursive:true,force:true});}
});
