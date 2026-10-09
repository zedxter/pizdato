import {open,mkdir,rename,readFile,readdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export const CHAT=-1004350521393;
export const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export const localDay=now=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(now);
export function validDay(day) {if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||new Date(`${day}T00:00Z`).toISOString().slice(0,10)!==day)throw new Error('Invalid edition date');return day;}
export function dueAt(day) {
 validDay(day);const base=Date.parse(`${day}T18:00:00Z`);
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',hour:'2-digit',hourCycle:'h23'}).format(base));
 return base-(hour-18)*3600000;
}
export async function durableWrite(path,value) {
 await mkdir(dirname(path),{recursive:true,mode:0o700});
 const temp=`${path}.${randomUUID()}.tmp`,f=await open(temp,'wx',0o600);
 try{await f.writeFile(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value,null,2)+'\n');await f.sync();}finally{await f.close();}
 await rename(temp,path);const dir=await open(dirname(path),'r');try{await dir.sync();}finally{await dir.close();}
}
async function json(path){return JSON.parse(await readFile(path,'utf8'));}
export class EditionStore {
 constructor(root){this.root=root;}
 path(day){return join(this.root,'editions',validDay(day)+'.json');}
 async initialize(day){validDay(day);try{const s=await json(join(this.root,'scheduler.json'));if(s.version!==1)throw new Error('Unsupported scheduler state');return s;}catch(e){if(e.code!=='ENOENT')throw e;const s={version:1,activationDate:day};await durableWrite(join(this.root,'scheduler.json'),s);return s;}}
 async save(e){e.updatedAt=new Date().toISOString();await durableWrite(this.path(e.day),e);}
 async get(day){const e=await json(this.path(day));if(e.version!==1||e.day!==day||!['discovering','drafting','reviewing','repairing','ready','sending','delivery-unknown','published','cancelled','blocked'].includes(e.phase)||!Array.isArray(e.findings))throw new Error('Invalid edition journal');return e;}
 async list(){let names;try{names=await readdir(join(this.root,'editions'));}catch(e){if(e.code==='ENOENT')return [];throw e;}return Promise.all(names.filter(n=>n.endsWith('.json')).sort().map(n=>this.get(n.slice(0,-5))));}
 async enqueue(now){const s=await json(join(this.root,'scheduler.json'));if(s.version!==1)throw new Error('Unsupported scheduler state');validDay(s.activationDate);
  for(let day=s.activationDate;dueAt(day)<=+now;day=new Date(Date.parse(day+'T12:00Z')+86400000).toISOString().slice(0,10)){
   try{await this.get(day);}catch(e){if(e.code!=='ENOENT')throw e;await this.save({version:1,day,phase:'discovering',revision:0,findings:[],abandoned:[],searches:[],visited:[],reserve:[],failures:0,nextAttemptAt:dueAt(day),lastActivationAt:0});}
  }
 }
 async record(e,record){await durableWrite(join(this.root,'reviews',`${e.day}-${randomUUID()}.json`),record);}
}
export async function finalize(e,store,vault){
 if(!e.receipt||e.receipt.chat?.id!==CHAT||!Number.isInteger(e.receipt.message_id))throw new Error('Invalid stored receipt');
 const receipt=`\nEdition: ${e.day}\nMessage ID: ${e.receipt.message_id}\nPost: https://t.me/pizdato_net/${e.receipt.message_id}\nPublished: ${e.sentAt}\n`;
 const body=`# Evening post ${e.day}\n\nCategory: ${e.draft.category}\nSource: ${e.draft.source_url}\nImage: ${e.draft.image_url}\n\n${e.draft.caption}\n${receipt}`;
 await durableWrite(join(vault,'posts',`evening-${e.day}.md`),body);
 await durableWrite(join(vault,'published/telegram',`evening-${e.day}.md`),receipt);
 e.phase='published';await store.save(e);
}
export async function recover(store,vault){for(const e of await store.list()){if(e.receipt&&e.phase!=='published')await finalize(e,store,vault);else if(e.phase==='sending'){e.phase='delivery-unknown';e.lastError='Send outcome unknown; reconcile before retry';await store.save(e);}}}
export function scheduleRetry(e,now,error){
 const routine=error?.code==='YIELD';e.failures=routine?0:(e.failures||0)+1;
 e.nextAttemptAt=+now+Math.max(routine?300000:Math.min(60,5*2**Math.min(e.failures-1,4))*60000,error?.retryAfterMs||0);
 e.lastError=routine?'Work checkpointed; continuing next activation':error?.safeMessage||'Dependency or review unavailable; retry scheduled';
 if(error?.blocked){e.resumePhase=e.phase;e.phase='blocked';e.nextAttemptAt=+now+3600000;}
}
export async function status(store,now){return (await store.list()).map(e=>({day:e.day,phase:e.phase,revision:e.revision,ageMinutes:Math.floor((+now-dueAt(e.day))/60000),overdue:!['published','cancelled'].includes(e.phase)&&+now>dueAt(e.day)+1800000,findings:e.findings,error:e.lastError,nextRetry:e.nextAttemptAt?new Date(e.nextAttemptAt).toISOString():null,receipt:e.receipt?.message_id}));}
export async function deliveryHistory(store,vault,day){
 const {loadHistory}=await import('../editorial/history.mjs');const history=await loadHistory(vault,day);
 const start=Date.parse(day+'T00:00Z')-13*86400000;
 for(const e of await store.list())if(e.receipt&&Date.parse(e.sentAt)>=start&&!history.some(h=>h.name===`evening-${e.day}.md`)){
  history.push({name:`evening-${e.day}.md`,text:await readFile(join(vault,'posts',`evening-${e.day}.md`),'utf8')});
 }
 return history.sort((a,b)=>a.name.localeCompare(b.name));
}
