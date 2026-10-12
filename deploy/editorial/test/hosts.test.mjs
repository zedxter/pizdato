import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
for(const slot of ['morning','evening']) for(const verdict of ['budget-success','budget-exhaust','structural','invalid-first','repair','repair-twice','reject','timeout','malformed','replace','approve',...(slot==='evening'?['stalled-repair','invalid-caption-swap','late-repair','source-swap','retired-source','late-replace','supporting','unverified-source']:[])]) for(const mode of verdict==='approve'?['publish','--dry-run']:['publish']) {
 test(`${slot} ${mode}: ${verdict} editorial outcome`,async()=>{
 const root=await mkdtemp(join(tmpdir(),'editorial-host-'));const trace=join(root,'trace');
 try {
 await mkdir(join(root,'vault/posts'),{recursive:true});await writeFile(trace,'');
 const prefix=`PIZDATO_${slot.toUpperCase()}`;
 const out=spawnSync(process.execPath,['--import',resolve('deploy/editorial/test/fake-network.mjs'),`deploy/${slot}/agent.mjs`,mode],{encoding:'utf8',env:{...process.env,NOUS_API_KEY:'test',COMPOSIO_CONSUMER_KEY:'test',PIZDATO_CHANNEL_ENV:join(root,'missing'),PIZDATO_EVENING_ENV:join(root,'missing'),[`${prefix}_VAULT`]:join(root,'vault'),[`${prefix}_STATE`]:join(root,'state'),TEST_TRACE:trace,TEST_VERDICT:verdict},timeout:10000});
 const events=await readFile(trace,'utf8');
 const pass=['invalid-caption-swap','late-repair','budget-success','invalid-first','source-swap','repair','repair-twice','replace','late-replace','supporting','approve'].includes(verdict);
 assert.equal(out.status,pass?0:1,out.stderr+out.stdout);
 assert.equal((events.match(/^SEND /gm)||[]).length,pass&&mode==='publish'?1:0,events);
 if(!['unverified-source','structural'].includes(verdict)) assert.ok(events.includes('REVIEW'),out.stderr+out.stdout);
 if(['budget-success','budget-exhaust','structural'].includes(verdict)) {
 assert.equal((events.match(/^SUBMISSION /gm)||[]).length,9,events);
 const records=await Promise.all((await readdir(join(root,'state/reviews'))).sort().map(async n=>JSON.parse(await readFile(join(root,'state/reviews',n),'utf8'))));
 assert.deepEqual(records.map(r=>[r.story,r.revision]),[[1,0],[1,1],[1,2],[2,0],[2,1],[2,2],[3,0],[3,1],[3,2]]);
 }
 if(verdict==='stalled-repair') {assert.equal((events.match(/^STALLED_REPAIR_TURN/gm)||[]).length,5,events);assert.equal((events.match(/^REVIEW /gm)||[]).length,1,events);}
 if(verdict==='invalid-caption-swap') {
 assert.equal((events.match(/^SUBMISSION /gm)||[]).length,3,events);
 const evidence=events.split('\n').filter(l=>l.startsWith('EVIDENCE ')).map(l=>JSON.parse(l.slice(9)));
 assert.deepEqual(evidence.map(e=>e.source.primary.url),['https://source.test/story-1']);
 assert.deepEqual(evidence.map(e=>[e.current.story,e.current.revision]),[[1,2]]);
 }
 if(verdict==='source-swap') {
 assert.equal((events.match(/^SUBMISSION /gm)||[]).length,3,events);
 const evidence=events.split('\n').filter(l=>l.startsWith('EVIDENCE ')).map(l=>JSON.parse(l.slice(9)));
 assert.deepEqual(evidence.map(e=>e.source.primary.url),['https://source.test/story-1','https://source.test/story-1']);
 assert.deepEqual(evidence.map(e=>[e.current.story,e.current.revision]),[[1,0],[1,2]]);
 }
 if(verdict==='invalid-first') assert.equal((events.match(/^SUBMISSION /gm)||[]).length,2,events);
 if(verdict==='retired-source') {assert.equal((events.match(/^REVIEW /gm)||[]).length,1,events);assert.equal((events.match(/^SUBMISSION /gm)||[]).length,7,events);}
 if(verdict.startsWith('repair')) {
 const send=events.split('\n').find(l=>l.startsWith('SEND '));assert.ok(send.includes('будильник зазвонил'),send);assert.ok(!send.includes('зазвонила'),send);
 const records=await Promise.all((await readdir(join(root,'state/reviews'))).sort().map(async n=>JSON.parse(await readFile(join(root,'state/reviews',n),'utf8'))));
 assert.deepEqual(records.map(r=>[r.story,r.revision]),verdict==='repair'?[[1,0],[1,1]]:[[1,0],[1,1],[1,2]]);
 }
 if(verdict.endsWith('replace')) {assert.ok(events.includes('REVIEW 2'),events);const send=events.split('\n').find(l=>l.startsWith('SEND '));assert.ok(send.includes('Самый короткий список покупок'),send);assert.ok(!send.includes('Если долго искать'),send);}
 if(!pass||mode==='--dry-run') {
 assert.equal((await readdir(join(root,'state'))).filter(n=>n.endsWith('.pending')).length,0);
 assert.deepEqual(await readdir(join(root,'vault/published/telegram')).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e)),[]);
 }
 }finally{await rm(root,{recursive:true,force:true});}
 });
}
for(const slot of ['morning','evening']) test(`${slot} --check with only an OpenRouter key fails before any network request`,async()=>{
 const root=await mkdtemp(join(tmpdir(),'editorial-openrouter-'));const trace=join(root,'trace'),guard=join(root,'record-network.mjs');
 try {
 await writeFile(trace,'');
 await writeFile(guard,`import {appendFileSync} from 'node:fs';globalThis.fetch=async url=>{appendFileSync(${JSON.stringify(trace)},String(url)+'\\n');throw new Error('network disabled');};`);
 const env={...process.env,OPENROUTER_API_KEY:'or-key',COMPOSIO_CONSUMER_KEY:'test',PIZDATO_CHANNEL_ENV:join(root,'missing'),PIZDATO_EVENING_ENV:join(root,'missing'),[`PIZDATO_${slot.toUpperCase()}_STATE`]:join(root,'state'),[`PIZDATO_${slot.toUpperCase()}_VAULT`]:join(root,'vault')};
 for(const k of ['NOUS_API_KEY','PIZDATO_LLM_API_KEY','PIZDATO_LLM_BASE_URL'])delete env[k];
 const out=spawnSync(process.execPath,['--import',guard,`deploy/${slot}/agent.mjs`,'--check'],{encoding:'utf8',env,timeout:20000});
 assert.notEqual(out.status,0,out.stdout);
 assert.equal(await readFile(trace,'utf8'),'','no request may be sent without a Nous credential');
 } finally {await rm(root,{recursive:true,force:true});}
});
