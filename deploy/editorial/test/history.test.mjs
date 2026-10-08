import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadHistory} from '../history.mjs';
test('today and previous 13 dates include full cross-slot confirmed posts across DST',async()=>{
 const root=await mkdtemp(join(tmpdir(),'editorial-history-'));
 try {
 await mkdir(join(root,'published/telegram'),{recursive:true});await mkdir(join(root,'posts'));
 for(const [slot,date,id] of [['morning','2026-10-26',1],['evening','2026-10-13',2],['evening','2026-10-12',3],['evening','2026-10-27',4]]) {
 const receipt=`Message ID: ${id}\nPost: https://t.me/pizdato_net/${id}\nPublished: ${date}T08:00:00Z\n`;
 await writeFile(join(root,`published/telegram/${slot}-${date}.md`),receipt);
 await writeFile(join(root,`posts/${slot}-${date}.md`),`Full wisdom and wish\n${receipt}`);
 }
 await writeFile(join(root,'posts/evening-2026-10-25.md'),'unconfirmed draft');
 const history=await loadHistory(root,'2026-10-26');
 assert.deepEqual(history.map(h=>h.name),['evening-2026-10-13.md','morning-2026-10-26.md']);
 assert.ok(history[1].text.includes('Full wisdom and wish'));
 await rm(join(root,'posts/morning-2026-10-26.md'));
 await assert.rejects(loadHistory(root,'2026-10-26'),/ENOENT/);
 } finally {await rm(root,{recursive:true,force:true});}
});
test('reads legacy confirmed Markdown markers but rejects unconfirmed marker text',async()=>{
 const root=await mkdtemp(join(tmpdir(),'editorial-legacy-'));
 try{
 await mkdir(join(root,'published/telegram'),{recursive:true});await mkdir(join(root,'posts'));
 const marker=join(root,'published/telegram/morning-2026-10-01.md');
 await writeFile(marker,'# Published marker\nДата: 2026-10-01\n**message_id:** 148\nchat: -1004350521393 (@pizdato_net)');
 await writeFile(join(root,'posts/morning-2026-10-01.md'),'Full legacy post and wish');
 assert.equal((await loadHistory(root,'2026-10-08')).length,1);
 await writeFile(marker,'draft only');
 await assert.rejects(loadHistory(root,'2026-10-08'),/Corrupt/);
 }finally{await rm(root,{recursive:true,force:true});}
});
