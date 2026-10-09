import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {EditionStore} from '../../evening/store.mjs';
import {tick} from '../../evening/worker.mjs';
const when=new Date('2026-10-09T16:00:00Z');
const wisdom='Если долго искать потерянный носок, можно случайно найти смысл жизни под диваном';
const draft={caption:`Дядя Миша заметил: будильник зазвонил. Пиздато: вовремя. Хуёво: рано.\nМудрость дня: «${wisdom}».\nМир ждёт твоего голоса: https://pizdato.net`,wisdom,source_url:'https://source.test/story',image_url:'https://source.test/cover.jpg',category:'Open microphone',supporting_urls:[]};
const approve={decision:'approve',grammar:true,meaning:true,freshness:true,voice:true,grounding:true,issues:[]};
async function fixture(fn) {
 const root=await mkdtemp(join(tmpdir(),'evening-delivery-'));
 try {const store=new EditionStore(join(root,'state'));await store.initialize('2026-10-09');await fn({root,store,vault:join(root,'vault')});}finally{await rm(root,{recursive:true,force:true});}
}
function services({review=async()=>approve,send=async()=>({message_id:55,chat:{id:-1004350521393}})}={}) {
 return {history:async()=>[],prepare:async({edition})=>({...draft,caption: draft.caption.replace('вовремя',`вовремя ${edition.revision}`)}),verify:async()=>({sources:{primary:{url:draft.source_url,text:'Verified alarm clock story'},supporting:[]},media:{hash:'cover-hash',url:draft.image_url}}),review:async messages=>({content:JSON.stringify(await review(JSON.parse(messages[1].content)))}),send,check:async()=>{}};
}
test('twelve repairs survive fresh worker activations before one approved send',async()=>fixture(async({store,vault})=>{
 let sends=0;
 const deps=services({review:async c=>c.current.revision<12?{...approve,decision:'revise',grammar:false,issues:['Fix agreement']}:approve,send:async()=>{sends++;return {message_id:55,chat:{id:-1004350521393}};}});
 for(let i=0;i<13;i++) {
  await tick({store:new EditionStore(store.root),vault,now:new Date(+when+i*300000),deps});
  const e=await store.get('2026-10-09');
  if(i<12){assert.equal(e.phase,'repairing');assert.equal(e.revision,i+1);assert.deepEqual(e.findings,['Fix agreement']);assert.equal(sends,0);}
 }
 assert.equal(sends,1);assert.equal((await store.get('2026-10-09')).phase,'published');
 await tick({store,vault,now:new Date(+when+4000000),deps});assert.equal(sends,1);
 assert.match(await readFile(join(vault,'published/telegram/evening-2026-10-09.md'),'utf8'),/55/);
}));
test('invalid draft returns to writer with validation findings',async()=>fixture(async({store,vault})=>{
 const deps=services();let calls=0;deps.prepare=async()=>++calls===1?{...draft,caption:'too short'}:draft;
 await tick({store,vault,now:when,deps});assert.equal((await store.get('2026-10-09')).phase,'repairing');
 await tick({store,vault,now:new Date(+when+300000),deps});assert.equal((await store.get('2026-10-09')).phase,'published');
}));
test('unknown send is never automatically retried',async()=>fixture(async({store,vault})=>{
 let sends=0;const deps=services({send:async()=>{sends++;throw new Error('timeout');}});
 await tick({store,vault,now:when,deps});assert.equal((await store.get('2026-10-09')).phase,'delivery-unknown');
 await tick({store,vault,now:new Date(+when+3600000),deps});assert.equal(sends,1);
}));
test('transient malformed review retains draft and backs off then recovers',async()=>fixture(async({store,vault})=>{
 const deps=services();let calls=0;deps.review=async()=>({content:++calls===1?'invalid':JSON.stringify(approve)});
 await tick({store,vault,now:when,deps});assert.equal((await store.get('2026-10-09')).draft.caption.includes('Дядя Миша'),true);
 await tick({store,vault,now:new Date(+when+1000),deps});assert.equal(calls,1);
 await tick({store,vault,now:new Date(+when+300000),deps});assert.equal((await store.get('2026-10-09')).phase,'published');
}));
test('fair rotation lets a new edition publish while old edition keeps repairing',async()=>fixture(async({store,vault})=>{
 const deps=services({review:async c=>c.source.editionDate==='2026-10-09'?{...approve,decision:'revise',grammar:false,issues:['Fix']}:approve});
 await tick({store,vault,now:when,deps});await tick({store,vault,now:new Date('2026-10-10T16:00Z'),deps});
 assert.equal((await store.get('2026-10-10')).phase,'published');assert.equal((await store.get('2026-10-09')).phase,'repairing');
}));
test('history change during review defers sending for new full review',async()=>fixture(async({store,vault})=>{
 let calls=0,sends=0;const deps=services({send:async()=>{sends++;}});deps.history=async()=>++calls===1?[]:[{text:'Morning publication'}];
 await tick({store,vault,now:when,deps});assert.equal(sends,0);assert.equal((await store.get('2026-10-09')).phase,'reviewing');
}));
test('definite non-delivery retries but uncertain outcome remains blocked',async()=>fixture(async({store,vault})=>{
 const deps=services({send:async()=>{throw Object.assign(new Error('rate limit'),{definiteNonDelivery:true,retryAfterMs:7200000});}});
 await tick({store,vault,now:when,deps});const e=await store.get('2026-10-09');assert.equal(e.phase,'ready');assert.equal(e.nextAttemptAt,+when+7200000);
}));
import {dueAt,durableWrite,recover,status} from '../../evening/store.mjs';
import {reconcile,cancel} from '../../evening/control.mjs';
test('confirmed receipt is finalized after crash without sending again',async()=>fixture(async({store,vault})=>{
 await store.enqueue(when);const e=await store.get('2026-10-09');Object.assign(e,{phase:'sending',draft,receipt:{message_id:66,chat:{id:-1004350521393}},sentAt:when.toISOString()});await store.save(e);
 await recover(store,vault);assert.equal((await store.get(e.day)).phase,'published');await recover(store,vault);
 assert.match(await readFile(join(vault,'posts/evening-2026-10-09.md'),'utf8'),/66/);
}));
test('DST due times and missing days are kept with their original identities',async()=>fixture(async({store})=>{
 assert.equal(new Date(dueAt('2026-10-24')).toISOString(),'2026-10-24T16:00:00.000Z');assert.equal(new Date(dueAt('2026-10-25')).toISOString(),'2026-10-25T17:00:00.000Z');
 await store.enqueue(new Date('2026-10-11T15:59Z'));assert.deepEqual((await store.list()).map(e=>e.day),['2026-10-09','2026-10-10']);
 assert.equal((await status(store,new Date('2026-10-11T15:59Z')))[0].overdue,true);
}));
test('wrong channel or payload cannot reconcile an uncertain edition',async()=>fixture(async({store,vault})=>{
 await tick({store,vault,now:when,deps:services({send:async()=>{throw new Error('timeout');}})});const e=await store.get('2026-10-09');
 await assert.rejects(reconcile({store,vault,day:e.day,evidence:{outcome:'delivered',chat:123,messageId:55,caption:e.draft.caption,mediaHash:e.media.hash,attestation:'Checked channel',reference:'https://t.me/pizdato_net/55'}}),/mismatch/);
 await reconcile({store,vault,day:e.day,evidence:{outcome:'delivered',chat:-1004350521393,messageId:55,caption:e.draft.caption,mediaHash:e.media.hash,attestation:'Checked channel and matching caption/photo',reference:'https://t.me/pizdato_net/55'}});
 assert.equal((await store.get(e.day)).phase,'published');
}));
test('cancellation is explicit and corruption is not silently reset',async()=>fixture(async({store})=>{
 await store.enqueue(when);await assert.rejects(cancel({store,day:'2026-10-09',reason:''}));
 await cancel({store,day:'2026-10-09',reason:'Owner cancels outdated edition'});assert.equal((await store.get('2026-10-09')).phase,'cancelled');
 await durableWrite(store.path('2026-10-09'),{version:99});await assert.rejects(store.enqueue(when),/Invalid/);
}));
import {publicationLock,saveMorningReceipt,recoverMorning} from '../publication.mjs';
test('shared publication lock serializes both slots and recovers morning receipt',async()=>fixture(async({store,vault,root})=>{
 const lock=join(root,'shared.lock');let inside=0,peak=0;
 await Promise.all([1,2].map(()=>publicationLock(lock,async()=>{inside++;peak=Math.max(peak,inside);await new Promise(r=>setTimeout(r,20));inside--;})));assert.equal(peak,1);
 await saveMorningReceipt(root,{day:'2026-10-09',text:'Morning approved text',receipt:{message_id:77,chat:{id:-1004350521393}},sentAt:when.toISOString()});
 await recoverMorning(root,vault);assert.match(await readFile(join(vault,'posts/morning-2026-10-09.md'),'utf8'),/Morning approved text/);
}));
test('existing corrupt marker never silently closes an edition',async()=>fixture(async({store,vault})=>{
 await durableWrite(join(vault,'published/telegram/evening-2026-10-09.md'),'partial write');
 await assert.rejects(tick({store,vault,now:when,deps:services()}),/marker/i);
 assert.notEqual((await store.get('2026-10-09')).phase,'published');
}));
test('an old legacy send intent blocks the corresponding edition',async()=>fixture(async({store,vault})=>{
 await durableWrite(join(store.root,'evening-2026-10-09.pending'),'legacy send intent');let sends=0;
 await tick({store,vault,now:when,deps:services({send:async()=>{sends++;}})});
 assert.equal(sends,0);assert.equal((await store.get('2026-10-09')).phase,'delivery-unknown');
}));
import {deliveryHistory} from '../../evening/store.mjs';
test('delayed publication stays in recent history by actual send date',async()=>fixture(async({store,vault})=>{
 const e={version:1,day:'2026-09-01',phase:'sending',findings:[],draft,receipt:{message_id:88,chat:{id:-1004350521393}},sentAt:'2026-10-09T17:00:00Z'};await store.save(e);await recover(store,vault);
 assert.equal((await deliveryHistory(store,vault,'2026-10-09')).some(h=>h.name==='evening-2026-09-01.md'),true);
}));
