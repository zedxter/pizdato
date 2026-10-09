import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
export async function publicationLock(path,fn){
 await mkdir(dirname(path),{recursive:true,mode:0o700});
 const child=spawn('flock',['-w','20',path,process.execPath,'-e',"process.stdout.write('LOCKED\\n');process.stdin.resume();process.stdin.on('end',()=>process.exit(0))"],{stdio:['pipe','pipe','ignore']});
 await new Promise((resolve,reject)=>{child.once('error',reject);child.stdout.once('data',resolve);child.once('exit',code=>reject(new Error(`Publication lock unavailable (${code})`)));});
 try{return await fn();}finally{child.stdin.end();await new Promise(resolve=>child.once('exit',resolve));}
}

// Receipt recovery is shared by both slots and runs under the publication lock.
export async function saveMorningReceipt(base,record){
 const {durableWrite,validDay}=await import('../evening/store.mjs');
 await durableWrite(`${base}/pizdato-publication/receipts/morning-${validDay(record.day)}.json`,record);
}
export async function recoverMorning(base,vault){
 const {readdir,readFile,unlink}=await import('node:fs/promises');const {join}=await import('node:path');
 const {durableWrite,CHAT,validDay}=await import('../evening/store.mjs');
 const dir=join(base,'pizdato-publication/receipts');let names;
 try{names=await readdir(dir);}catch(e){if(e.code==='ENOENT')return;throw e;}
 for(const name of names.filter(n=>/^morning-\d{4}-\d{2}-\d{2}\.json$/.test(n))){
  const p=join(dir,name),r=JSON.parse(await readFile(p,'utf8'));if(r.finalized)continue;
  validDay(r.day);if(r.receipt?.chat?.id!==CHAT||!Number.isInteger(r.receipt.message_id)||typeof r.text!=='string')throw new Error('Invalid morning confirmation');
  const receipt=`\nEdition: ${r.day}\nMessage ID: ${r.receipt.message_id}\nPost: https://t.me/pizdato_net/${r.receipt.message_id}\nPublished: ${r.sentAt}\n`;
  await durableWrite(join(vault,'posts',`morning-${r.day}.md`),`# Morning wisdom ${r.day}\n\n${r.text}\n${receipt}`);
  await durableWrite(join(vault,'published/telegram',`morning-${r.day}.md`),receipt);
  r.finalized=true;await durableWrite(p,r);
  await unlink(join(base,'pizdato-morning',`morning-${r.day}.pending`)).catch(e=>{if(e.code!=='ENOENT')throw e;});
 }
}
