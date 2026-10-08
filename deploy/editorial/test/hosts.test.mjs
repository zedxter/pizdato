import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
for(const slot of ['morning','evening']) for(const verdict of ['reject','timeout','malformed','replace','approve',...(slot==='evening'?['late-replace','supporting','unverified-source']:[])]) for(const mode of verdict==='approve'?['publish','--dry-run']:['publish']) {
 test(`${slot} ${mode}: ${verdict} editorial outcome`,async()=>{
 const root=await mkdtemp(join(tmpdir(),'editorial-host-'));const trace=join(root,'trace');
 try {
 await mkdir(join(root,'vault/posts'),{recursive:true});await writeFile(trace,'');
 const prefix=`PIZDATO_${slot.toUpperCase()}`;
 const out=spawnSync(process.execPath,['--import',resolve('deploy/editorial/test/fake-network.mjs'),`deploy/${slot}/agent.mjs`,mode],{encoding:'utf8',env:{...process.env,OPENROUTER_API_KEY:'test',COMPOSIO_CONSUMER_KEY:'test',PIZDATO_CHANNEL_ENV:join(root,'missing'),PIZDATO_EVENING_ENV:join(root,'missing'),[`${prefix}_VAULT`]:join(root,'vault'),[`${prefix}_STATE`]:join(root,'state'),TEST_TRACE:trace,TEST_VERDICT:verdict},timeout:10000});
 const events=await readFile(trace,'utf8');
 const pass=['replace','late-replace','supporting','approve'].includes(verdict);
 assert.equal(out.status,pass?0:1,out.stderr+out.stdout);
 assert.equal((events.match(/^SEND /gm)||[]).length,pass&&mode==='publish'?1:0,events);
 if(verdict!=='unverified-source') assert.ok(events.includes('REVIEW'),out.stderr+out.stdout);
 if(verdict.endsWith('replace')) {assert.ok(events.includes('REVIEW 2'),events);const send=events.split('\n').find(l=>l.startsWith('SEND '));assert.ok(send.includes('Самый короткий список покупок'),send);assert.ok(!send.includes('Если долго искать'),send);}
 if(!pass||mode==='--dry-run') {
 assert.equal((await readdir(join(root,'state'))).filter(n=>n.endsWith('.pending')).length,0);
 assert.deepEqual(await readdir(join(root,'vault/published/telegram')).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e)),[]);
 }
 }finally{await rm(root,{recursive:true,force:true});}
 });
}
