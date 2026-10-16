// Optional public material; feed outages never prevent an original morning joke.
const feeds = [
 {url:'https://www.anekdot.ru/rss/export_j.xml',host:'www.anekdot.ru',kind:'anecdote'},
 {url:'https://www.upi.com/rss/Odd_News/',host:'www.upi.com',kind:'news'}
];
const decode=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>Number(n)<=0x10ffff?String.fromCodePoint(Number(n)):'');
const plain=s=>decode(s).replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').trim();
const tag=(item,name)=>item.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]||'';
export const FORMATS=Object.freeze(['everyday miniature','short fictional dialogue','found anecdote or sourced small absurdity','third-person story about Uncle Misha']);
export const preferredFormat=day=>FORMATS[Math.floor(Date.parse(day+'T00:00:00Z')/86400000)%FORMATS.length];
export async function loadMaterial(history=[],fetcher=fetch) {
 const sources=[],notes=[];
 const batches=await Promise.all(feeds.map(async feed=>{
  try {
   const response=await fetcher(feed.url,{redirect:'error',signal:AbortSignal.timeout(6000),headers:{Accept:'application/rss+xml,application/xml,text/xml','User-Agent':'pizdato-morning/1.0'}});
   if(!response.ok) throw new Error(`HTTP ${response.status}`);
   const chunks=[];let size=0;
   for await(const chunk of response.body){size+=chunk.length;if(size>300000)throw new Error('feed too large');chunks.push(chunk);}
   const xml=Buffer.concat(chunks).toString('utf8');
   if(!/<rss\b/i.test(xml))throw new Error('not an RSS feed');
   return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,15).flatMap(([_,item],index)=>{
    try {
     const url=new URL(decode(tag(item,'link')).trim());
     if(url.protocol!=='https:'||url.hostname!==feed.host||url.username||url.password||url.port)return [];
     if(history.some(entry=>entry.text.includes(url.href)))return [];
     const text=plain(tag(item,'description'));
     if(text.length<80||text.length>2200)return [];
     const author=plain(tag(item,'dc:creator')).slice(0,100);
     return [{id:`${feed.kind}-${index}`,kind:feed.kind,...(author&&{author}),primary:{url:url.href,text,title:plain(tag(item,'title')),publishedAt:plain(tag(item,'pubDate')),fetchedAt:new Date().toISOString(),evidenceUrl:feed.url},supporting:[]}];
    }catch{return [];}
   }).slice(0,5);
  }catch(error){notes.push(`${feed.host}: material unavailable (${error.message})`);return [];}
 }));
 for(const batch of batches)sources.push(...batch);
 return {sources,notes};
}
