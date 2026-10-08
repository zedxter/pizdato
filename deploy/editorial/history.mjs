import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
export async function loadHistory(vault, day) {
  const end=Date.parse(`${day}T00:00:00Z`);
  if(!Number.isFinite(end)||new Date(end).toISOString().slice(0,10)!==day) throw new Error('Invalid local date');
  const start=new Date(end-13*86400000).toISOString().slice(0,10);
  let names;
  try {names=await readdir(join(vault,'published/telegram'));} catch(e) {if(e.code==='ENOENT')return [];throw e;}
  const entries=names.map(name=>({name,match:name.match(/^(morning|evening)-(\d{4}-\d{2}-\d{2})\.md$/)}))
    .filter(e=>e.match && e.match[2]>=start && e.match[2]<=day)
    .sort((a,b)=>a.match[2].localeCompare(b.match[2])||b.match[1].localeCompare(a.match[1]));
  return Promise.all(entries.map(async({name})=>{
    const marker=await readFile(join(vault,'published/telegram',name),'utf8');
    const plain=marker.replace(/[*`]/g,'');
    const id=plain.match(/(?:Message ID|message_id):\s*(\d+)/i)?.[1];
    if(!id || Number(id)<=0 || !/(?:@pizdato_net|t\.me\/pizdato_net\/|chat[^\n]*-1004350521393)/i.test(plain) || !plain.includes(name.slice(name.indexOf('-')+1,-3))) throw new Error(`Corrupt publication marker: ${name}`);
    const text=await readFile(join(vault,'posts',name),'utf8');
    if(!text.trim()||text.length>16000) throw new Error(`Corrupt confirmed archive: ${name}`);
    return {name,text};
  }));
}

export function recentWisdoms(history) {
  return history.flatMap(({text})=>{
    const plain=text.replace(/[*`]/g,'');
    return [...plain.matchAll(/«([^»]+)»/gu)].map(m=>m[1]).concat(
      [...plain.matchAll(/(?:Мудрость дня(?: от дяди Миши)?|Wisdom)\s*:?\s*[«"]?([^\n»"]+)/giu)].map(m=>m[1].trim())
    );
  });
}
