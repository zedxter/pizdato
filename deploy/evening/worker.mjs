import {join,dirname} from 'node:path';
import {readFile} from 'node:fs/promises';
import {createGate,assertApproved,formatIssue} from '../editorial/gate.mjs';
import {validateProfile} from '../editorial/compose-rubric.mjs';
import channel from '../editorial/profiles/pizdato-channel.mjs';
import {publicationLock,recoverMorning} from '../editorial/publication.mjs';
import {SECTIONS,CTA,normalize,render,check,chooseWisdom,locate,sectionsFor,merge,category,weekday} from './compose.mjs';
// The host prints these; a finding about them can never be repaired by the writer.
const HOST_TEXT=['Пиздато:','Хуёво:','Мудрость дня:',CTA];
import {digest,CHAT,localDay,recover,finalize,scheduleRetry,deadlineAt} from './store.mjs';
// Cron fires every five minutes with jitter; work due within the next minute runs now instead of idling a whole period.
const NEXT=300000,SLACK=60000,DRAFTS_PER_ACTIVATION=3,FAILURES_PER_STORY=3;
const OPEN=['discovering','drafting','reviewing','repairing','ready','blocked'];
// Dropping a story resets everything that belonged to it; the gate counts it as a new story.
function abandon(e,advanceGate=true,source){
 const url=source||e.draft?.source_url;if(url&&!e.abandoned.includes(url))e.abandoned.push(url);
 Object.assign(e,{draft:null,phase:'discovering',blockers:[],suggestions:[],pendingVerification:[],flaggedWisdoms:[],searches:[],mechanical:0,verifyFailures:0,reviewFailures:0,reviewedSections:null,reviewedCaption:null,blockedSections:[]});
 delete e.evidence;delete e.rawDraft;delete e.media;
 if(advanceGate&&e.gate){e.gate={...e.gate,story:(e.gate.story||1)+1,revision:0};e.revision=0;}
}
const expire=(e,at)=>{e.phase='cancelled';e.cancellation={reason:'Evening deadline passed without an approved post',at:new Date(at).toISOString(),automatic:true};};
export async function tick(args) {
 const expired=[],result=await activate(args,expired);
 return {...result,expired};
}
async function activate({store,vault,now=new Date(),deps,dryRun=false},expired) {
 // Logical clock: the activation time plus real elapsed time, for the deadline check right before sending.
 const started=Date.now(),clock=()=>+now+(Date.now()-started);
 const lock=join(dirname(store.root),'pizdato-publication.lock');
 await publicationLock(lock,async()=>{await recoverMorning(dirname(store.root),vault);await recover(store,vault);});
 await store.enqueue(now);
 const editions=await store.list();
 for(const e of editions){
  if(e.phase==='published'||e.phase==='cancelled')continue;
  // Same marker grammar as confirmed history, including the hand-written format used before 2026-10-06.
  try{const marker=(await readFile(join(vault,'published/telegram',`evening-${e.day}.md`),'utf8')).replace(/[*`]/g,'');if(!/(?:Message ID|message_id):\s*[1-9]\d*/i.test(marker)||!/(?:@pizdato_net|t\.me\/pizdato_net\/|chat[^\n]*-1004350521393)/i.test(marker)||!marker.includes(e.day))throw new Error('Invalid publication marker');await readFile(join(vault,'posts',`evening-${e.day}.md`));e.phase='published';await store.save(e);}catch(err){if(err.code!=='ENOENT')throw err;}
 }
 for(const old of await store.list()){if(old.phase==='published')continue;try{await readFile(join(store.root,`evening-${old.day}.pending`));old.phase='delivery-unknown';old.lastError='Legacy send intent requires explicit reconciliation';await store.save(old);}catch(error){if(error.code!=='ENOENT')throw error;}}
 if(!dryRun)for(const old of await store.list())if(OPEN.includes(old.phase)&&+now>=deadlineAt(old.day)){
  expire(old,+now);expired.push(old.day);
  await store.record(old,{kind:'expiry',...old.cancellation,findings:old.findings});await store.save(old);
 }
 const e=(await store.list()).filter(e=>OPEN.includes(e.phase)&&e.nextAttemptAt<=+now+SLACK).sort((a,b)=>a.lastActivationAt-b.lastActivationAt||a.day.localeCompare(b.day))[0];
 if(!e)return {phase:'idle'};
 e.lastActivationAt=+now;e.blockers??=[];e.suggestions??=[];e.flaggedWisdoms??=[];await store.save(e);
 const checkpoint=()=>store.save(e);
 try{
  validateProfile(channel);
  if(e.phase==='blocked'){await deps.check();e.phase=e.resumePhase||'discovering';}
  const history=await deps.history(localDay(now));
  if(e.draft&&!Array.isArray(e.draft.body)){
   // Caption-only drafts predate host-rendered sections; their counters and evidence belong to the old loop.
   e.draft=null;e.phase='drafting';e.revision=0;e.mechanical=0;e.failures=0;delete e.evidence;
   if(e.gate)e.gate={...e.gate,revision:0};
  }
  for(let drafts=0;;){
   if(e.phase!=='reviewing'&&e.phase!=='ready'){
    const previous=e.draft,targeted=[...e.blockers,...e.suggestions];
    e.unlocked=previous&&targeted.length?sectionsFor(previous,targeted):[...SECTIONS];await checkpoint();
    const next=normalize(await deps.prepare({edition:e,history,checkpoint,now}));drafts++;
    if(e.abandoned.includes(next.source_url)){e.draft=null;e.phase='discovering';e.findings=['The writer returned an abandoned source; choosing another story'];e.nextAttemptAt=+now+NEXT;await checkpoint();return e;}
    // Only flagged sections may change in a repair; everything already reviewed stays byte-identical.
    const draft=previous&&next.source_url===previous.source_url?merge(previous,next,e.unlocked):next;
    if(!previous||e.unlocked.includes('wisdom'))draft.wisdom=chooseWisdom(draft,{flagged:e.flaggedWisdoms,history});
    e.draft={...draft,category:category(e.day)};e.draft.caption=render(e.draft);e.phase='reviewing';await checkpoint();
   }
   // A caption identical to a blocked one never reaches the editor again; quoted defects are re-checked once per round,
   // because a quote may be wider than the fixed error and the blocked sections are re-reviewed in full anyway.
   const problems=check(e.draft,{history,flagged:e.flaggedWisdoms,unresolved:e.echoPending?e.pendingVerification||[]:[],previous:e.reviewedCaption??null,blocked:(e.pendingVerification||[]).length>0});e.echoPending=false;
   if(!problems.length)break;
   e.blockers=problems;e.suggestions=[];e.findings=problems.map(formatIssue);e.unlocked=sectionsFor(e.draft,problems);e.phase='repairing';e.mechanical=(e.mechanical||0)+1;
   await store.record(e,{kind:'validation',story:e.gate?.story||1,revision:e.gate?.revision||0,mechanical:e.mechanical,unlocked:e.unlocked,text:e.draft.caption,issues:e.findings});await checkpoint();
   // Three activations of failed mechanical repairs mean the writer cannot fit this story; try another one.
   if(e.mechanical>=3*DRAFTS_PER_ACTIVATION){abandon(e);e.findings=['Story abandoned after repeated failed mechanical repairs',...e.findings];e.nextAttemptAt=+now+NEXT;await checkpoint();return e;}
   if(drafts>=DRAFTS_PER_ACTIVATION){e.nextAttemptAt=+now+NEXT;await checkpoint();return e;}
  }
  let verified;
  try{verified=await deps.verify(e.draft,{edition:e,checkpoint,now});}catch(error){if(error.code!=='YIELD'&&!error.blocked)error.verifyFailure=true;throw error;}
  e.evidence=verified.sources;e.media=verified.media;await checkpoint();
  const gate=createGate({profile:channel,policy:'persistent-evening',initial:e.gate,history,request:deps.review,record:r=>store.record(e,r)});
  const firstReview=gate.state.revision===0;
  // The editor checks what changed plus every section the previous review blocked; an unchanged re-review is a full review.
  const reviewed=e.reviewedSections?.source_url===e.draft.source_url?e.reviewedSections:null;
  const changed=reviewed?SECTIONS.filter(k=>JSON.stringify(reviewed[k])!==JSON.stringify(e.draft[k])||(e.blockedSections||[]).includes(k)):[];
  let result;
  try{result=await gate.review({text:e.draft.caption,fields:{wisdom:e.draft.wisdom},hostText:HOST_TEXT,changedSections:changed.length?changed:null,source:{...verified.sources,editionDate:e.day,currentDate:localDay(now),category:e.draft.category,weekday:weekday(e.day)}});}
  catch(error){e.gate=gate.snapshot();if(error.code!=='YIELD'&&error.code!=='EDITORIAL_CONFIG')error.reviewFailure=true;throw error;}
  // The advanced gate state and the verdict are saved together, so a crash cannot replay a review under new counters.
  e.gate=gate.snapshot();e.revision=e.gate.revision;e.failures=0;e.mechanical=0;e.reviewFailures=0;e.verifyFailures=0;delete e.lastError;
  // Taste suggestions get one polishing pass per story; later rounds fix blockers only; category fit is never pushed onto the copy.
  e.blockers=result.blockers;e.pendingVerification=result.blockers;e.echoPending=true;e.suggestions=firstReview&&result.nextAction==='repair'?result.suggestions.filter(i=>i.category!=='category'):[];
  e.reviewedSections=Object.fromEntries(['source_url',...SECTIONS].map(k=>[k,e.draft[k]]));e.reviewedCaption=e.draft.caption;
  e.blockedSections=result.blockers.some(i=>!locate(e.draft,i).length)?[...SECTIONS]:[...new Set(result.blockers.flatMap(i=>locate(e.draft,i)))];
  e.findings=[...e.blockers,...e.suggestions].map(formatIssue);
  if(result.blockers.some(i=>{const hits=locate(e.draft,i);return hits.length===1&&hits[0]==='wisdom';}))e.flaggedWisdoms=[...new Set([...e.flaggedWisdoms,e.draft.wisdom])];
  if(result.decision!=='approve'){
   if(result.nextAction==='replace')abandon(e,false);
   else {e.phase='repairing';e.unlocked=sectionsFor(e.draft,[...e.blockers,...e.suggestions]);}
   e.nextAttemptAt=+now+NEXT;await checkpoint();return e;
  }
  e.phase='ready';await checkpoint();assertApproved(e.draft.caption,result);
  if(dryRun)return {...e,dryRun:true};
  await deps.ready?.(e.media);await checkpoint();
  await publicationLock(lock,async()=>{
   await recoverMorning(dirname(store.root),vault);await recover(store,vault);
   if(digest(await deps.history(localDay(now)))!==digest(history)){e.phase='reviewing';e.nextAttemptAt=+now+NEXT;await checkpoint();return;}
   // Never send after the evening deadline, and never start a send that the activation budget could cut short.
   if(clock()>=deadlineAt(e.day)){expire(e,clock());expired.push(e.day);await store.record(e,{kind:'expiry',...e.cancellation,findings:e.findings});await checkpoint();return;}
   if(deps.canSend&&!deps.canSend()){e.phase='ready';e.lastError='Too little activation time left to send safely';e.nextAttemptAt=+now+NEXT;await checkpoint();return;}
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
  // A broken profile is the release's fault, not the story's: keep the story and its counters, retry next tick.
  else if(error.code==='EDITORIAL_CONFIG'){e.lastError=error.message;e.nextAttemptAt=+now+NEXT;}
  else {
   if(e.phase==='sending')e.phase='ready';
   // Repairs, replacements and abandoned stories are progress, so they continue on the next tick without backoff.
   let progressed=false;
   if(error.repairIssue){
    e.phase='repairing';e.blockers=[{category:'unsupported-claim',quote:'',problem:error.repairIssue,fix:'Remove the unsupported detail or cite a working fetched source.'}];e.suggestions=[];e.findings=[error.repairIssue];
    e.mechanical=(e.mechanical||0)+1;progressed=true;
    if(e.mechanical>=3*DRAFTS_PER_ACTIVATION){abandon(e);e.findings=['Story abandoned after repeated unusable supporting evidence',error.repairIssue];}
   }
   if(error.replace){abandon(e,true,error.replaceSource);e.findings=[error.safeMessage||'Source or cover unusable; replace candidate'];progressed=true;}
   else if(error.verifyFailure&&(e.verifyFailures=(e.verifyFailures||0)+1)>=FAILURES_PER_STORY){abandon(e);e.findings=['Story abandoned: its sources kept failing verification'];progressed=true;}
   else if(error.reviewFailure&&(e.reviewFailures=(e.reviewFailures||0)+1)>=FAILURES_PER_STORY){abandon(e);e.findings=['Story abandoned: review kept failing on the same text'];progressed=true;}
   if(progressed){e.nextAttemptAt=+now+NEXT;delete e.lastError;}
   else scheduleRetry(e,now,error);
  }
  await checkpoint();
 }
 return e;
}
