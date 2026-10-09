import {join,dirname} from 'node:path';
import {publicationLock} from '../editorial/publication.mjs';
import {CHAT,digest,finalize} from './store.mjs';
export async function reconcile({store,vault,day,evidence}){
 return publicationLock(join(dirname(store.root),'pizdato-publication.lock'),async()=>{
  const e=await store.get(day);
  if(!['sending','delivery-unknown'].includes(e.phase)||!e.intent)throw new Error('No uncertain send to reconcile');
  if(!evidence?.attestation?.trim()||!evidence.reference?.trim())throw new Error('Explicit channel-inspection attestation and evidence reference required');
  if(evidence.outcome==='delivered'){
   if(evidence.chat!==CHAT||!Number.isInteger(evidence.messageId)||evidence.messageId<=0||evidence.caption!==e.intent.caption||evidence.mediaHash!==e.intent.mediaHash||evidence.reference!==`https://t.me/pizdato_net/${evidence.messageId}`)throw new Error('Reconciliation channel or payload mismatch');
   if(digest({caption:evidence.caption,chat:CHAT,media:evidence.mediaHash})!==e.intent.payloadHash)throw new Error('Intent hash mismatch');
   e.receipt={message_id:evidence.messageId,chat:{id:CHAT}};e.sentAt=new Date().toISOString();
  }else if(evidence.outcome==='not-delivered'){e.phase='reviewing';delete e.intent;e.nextAttemptAt=Date.now();}
  else throw new Error('Unknown reconciliation outcome');
  await store.record(e,{kind:'operator-reconciliation',at:new Date().toISOString(),evidence});await store.save(e);
  if(e.receipt)await finalize(e,store,vault);
  return e;
 });
}
export async function cancel({store,day,reason}){if(!reason?.trim())throw new Error('Cancellation reason required');const e=await store.get(day);if(['sending','delivery-unknown','published'].includes(e.phase))throw new Error('Reconcile uncertain sends first; confirmed delivery cannot be cancelled');e.phase='cancelled';e.cancellation={reason,at:new Date().toISOString()};await store.record(e,{kind:'operator-cancellation',...e.cancellation});await store.save(e);}
