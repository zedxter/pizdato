import {join,dirname} from 'node:path';
import {readFile} from 'node:fs/promises';
import {createGate,assertApproved} from '../editorial/gate.mjs';
import {publicationLock,recoverMorning} from '../editorial/publication.mjs';
import {validateDraft} from './agent.mjs';
import {digest,CHAT,localDay,recover,finalize,scheduleRetry} from './store.mjs';
export async function tick({store,vault,now=new Date(),deps,dryRun=false}) {
 const lock=join(dirname(store.root),'pizdato-publication.lock');
 await publicationLock(lock,async()=>{await recoverMorning(dirname(store.root),vault);await recover(store,vault);});
 await store.enqueue(now);
 const editions=await store.list();
 for(const e of editions){
  if(e.phase==='published'||e.phase==='cancelled')continue;
  try{const marker=await readFile(join(vault,'published/telegram',`evening-${e.day}.md`),'utf8');if(!/Message ID:\s*[1-9]\d*/i.test(marker)||!marker.includes('https://t.me/pizdato_net/')||!marker.includes(e.day))throw new Error('Invalid publication marker');await readFile(join(vault,'posts',`evening-${e.day}.md`));e.phase='published';await store.save(e);}catch(err){if(err.code!=='ENOENT')throw err;}
 }
 for(const old of await store.list()){if(old.phase==='published')continue;try{await readFile(join(store.root,`evening-${old.day}.pending`));old.phase='delivery-unknown';old.lastError='Legacy send intent requires explicit reconciliation';await store.save(old);}catch(error){if(error.code!=='ENOENT')throw error;}}
 const e=(await store.list()).filter(e=>!['published','cancelled','delivery-unknown','sending'].includes(e.phase)&&e.nextAttemptAt<=+now).sort((a,b)=>a.lastActivationAt-b.lastActivationAt||a.day.localeCompare(b.day))[0];
 if(!e)return {phase:'idle'};
 e.lastActivationAt=+now;await store.save(e);
 const checkpoint=()=>store.save(e);
 try{
  if(e.phase==='blocked'){await deps.check();e.phase=e.resumePhase||'discovering';}
  const history=await deps.history(localDay(now));
  if(e.phase!=='reviewing'&&e.phase!=='ready'){
   e.draft=await deps.prepare({edition:e,history,checkpoint,now});e.phase='reviewing';await checkpoint();
  }
  try{validateDraft(e.draft);}catch(error){e.phase='repairing';e.findings=[error.message];e.revision++;e.nextAttemptAt=+now+300000;await store.record(e,{kind:'validation',text:e.draft,issues:e.findings});await checkpoint();return e;}
  const verified=await deps.verify(e.draft,{edition:e,checkpoint,now});
  e.evidence=verified.sources;e.media=verified.media;await checkpoint();
  const gate=createGate({policy:'persistent-evening',initial:e.gate,history,request:deps.review,record:r=>store.record(e,r)});
  let result;
  try{result=await gate.review({text:e.draft.caption,wisdom:e.draft.wisdom,source:{...verified.sources,editionDate:e.day,currentDate:localDay(now),category:e.draft.category,weekday:new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'Europe/Berlin'}).format(new Date(e.day+'T12:00Z'))}});}finally{e.gate=gate.snapshot();await checkpoint();}
  e.revision=e.gate.revision;e.findings=result.issues;e.failures=0;
  if(result.decision!=='approve'){
   if(result.nextAction==='replace'){e.abandoned.push(e.draft.source_url);e.draft=null;e.phase='discovering';}
   else e.phase='repairing';
   e.nextAttemptAt=+now+300000;await checkpoint();return e;
  }
  e.phase='ready';await checkpoint();assertApproved(e.draft.caption,result);
  if(dryRun)return {...e,dryRun:true};
  await deps.ready?.(e.media);await checkpoint();
  await publicationLock(lock,async()=>{
   await recoverMorning(dirname(store.root),vault);await recover(store,vault);
   if(digest(await deps.history(localDay(now)))!==digest(history)){e.phase='reviewing';e.nextAttemptAt=+now+300000;await checkpoint();return;}
   assertApproved(e.draft.caption,result);
   e.intent={chat:CHAT,payloadHash:digest({caption:e.draft.caption,chat:CHAT,media:e.media.hash}),caption:e.draft.caption,mediaHash:e.media.hash,at:new Date().toISOString()};
   e.phase='sending';await checkpoint();
   const receipt=await deps.send(e.draft,e.media);
   if(!Number.isInteger(receipt?.message_id)||receipt.chat?.id!==CHAT)throw new Error('Unconfirmed send');
   e.receipt=receipt;e.sentAt=new Date().toISOString();await checkpoint();await finalize(e,store,vault);
  });
 }catch(error){
  if(e.receipt)throw error;
  if(e.phase==='sending'&&!error.definiteNonDelivery){e.phase='delivery-unknown';e.lastError='Send outcome unknown; reconcile before retry';}
  else {if(e.phase==='sending')e.phase='ready';if(error.replace){if(e.draft)e.abandoned.push(e.draft.source_url);e.draft=null;e.phase='discovering';e.findings=[error.safeMessage||'Source or cover unusable; replace candidate'];}scheduleRetry(e,now,error);}
  await checkpoint();
 }
 return e;
}
