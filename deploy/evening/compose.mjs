// Host-owned evening caption: the writer supplies sections; the host renders, measures and locks them.
import {recentWisdoms} from '../editorial/history.mjs';
export const CTA='Мир ждёт твоего голоса: https://pizdato.net';
// Owner limits: caption <=950 characters; the wisdom floor is 6 words because the channel's best punchlines are 6–9 words.
export const LIMITS={chars:950,utf16:1024,wisdom:[6,15],paragraphs:[2,3]};
export const SECTIONS=['hook','body','pizdato','huevo','wisdom'];
const CATEGORIES={Monday:'Понедельник — ИИ недели',Tuesday:'Вторник — жизнь за границей',Wednesday:'Среда — разбор недели',Thursday:'Четверг — Золотой фонд',Friday:'Пятница — свободный микрофон',Saturday:'Суббота — выходной лайфхак',Sunday:'Воскресенье — итоги недели'};
export const weekday=day=>new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'Europe/Berlin'}).format(new Date(day+'T12:00Z'));
export const category=day=>CATEGORIES[weekday(day)];
export const words=s=>String(s??'').match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)||[];
const flat=s=>String(s??'').replace(/\s+/g,' ').trim();
const key=s=>flat(s).toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const LABELS=/^(?:пиздато|ху[её]во|мудрость дня(?: от дяди миши)?)\s*[:—–-]\s*/iu;
const unlabel=s=>flat(s).replace(LABELS,'');
export const sameWisdom=(a,b)=>!!key(a)&&key(a)===key(b);
// Strip only a balanced pair of outer quotes and a single final full stop; ellipses and inner quotes stay.
const cleanWisdom=s=>{let w=unlabel(s);const outer=w.match(/^[«"„“]([^«»"„“”]*)[»"“”]([.!?…]*)$/u);if(outer)w=outer[1]+outer[2];return w.replace(/(?<![.?!…])\.$/u,'').trim();};
export function normalize(d){
 const body=(Array.isArray(d.body)?d.body:[d.body]).map(flat).filter(p=>p&&!p.startsWith(CTA)&&!LABELS.test(p));
 return {...d,hook:flat(d.hook),body,pizdato:unlabel(d.pizdato),huevo:unlabel(d.huevo),wisdom:cleanWisdom(d.wisdom),wisdom_options:(d.wisdom_options||[]).map(cleanWisdom).filter(Boolean)};
}
export const quoteWisdom=w=>/[!?…]$|\.\.$/u.test(w)?`«${w}»`:`«${w}».`;
export const render=d=>{const verdict=[`Пиздато: ${d.pizdato}`,`Хуёво: ${d.huevo}`];if(d.huevo_first)verdict.reverse();return [d.hook,...d.body,verdict.join('\n'),`Мудрость дня: ${quoteWisdom(d.wisdom)}`,CTA].join('\n\n');};
const PERSONA=/дяд[яеиюь]\p{L}*\s+миш\p{L}*/iu;
const FIRST_PERSON=/(?<!\p{L})(?:я\s+(?:наш[её]л|нашла|вижу|видел|видела|думаю|считаю|прочитал|прочитала|листал|листала)|мне\s+кажется)(?!\p{L})/iu;
// Anything Telegram would render as a link or mention; bare brand names such as Booking.com are fine.
const LINK=/https?:\/\/\S+|www\.\S+|(?<![\p{L}\p{N}])t\.me\/\S+|(?<![\p{L}\p{N}@])@[A-Za-z0-9_]{4,}|(?<![\p{L}\p{N}])[\p{L}\p{N}-]+\.[a-z]{2,}\/\S*/iu;
const unquoted=text=>text.replace(/«[^«»]*»|„[^„“]*“|"[^"]*"/gu,' ');
// Conservative stock phrases from the 2026-09/10 archive audit; each finding quotes the exact match so the writer can replace it.
export const STOCK=[/листал[аи]?\s+(?:\p{L}+\s+)?ленту/iu,/допил[аи]?\s+(?:чай|кофе)/iu,/чуть\s+(?:кофе\s+)?не\s+поперхнул\p{L}*/iu,/чуть не выронил\p{L}* чашку/iu,/прибалдел\p{L}*/iu,/дядя миша наткнулся/iu,/(?:откопал|сидел|залез)\p{L}*\s+в\s+ленте?у?/iu,/завис навсегда/iu,/(?:новост[ьи]|истори[юяи]),?\s+от которой/iu,/лучшая новость недели/iu,/и вот соль/iu,/вишенка(?::|\s+на торте)/iu,/на минуточку/iu,/(?:смысл|разбор) простой:/iu,/решение нашли гениальное/iu,/дальше веселее/iu,/честная оговорка/iu,/честно пишет/iu,/это не просто [^.!?\n]{1,40}, (?:а|это)(?!\p{L})/iu,/вселенная отвечает/iu,/мир (?:стал )?чуточку/iu,/настоящая магия/iu,/вот это я понимаю/iu,/звучит двусмысленно/iu,/и это вся новость/iu,/вот это поворот/iu,/кто бы мог подумать/iu,/не поверите/iu,/держитесь крепче/iu,/барабанная дробь/iu,/давайте разберёмся/iu,/стоит отметить/iu,/важно понимать/iu,/в мире, где/iu,/(?:^|[.!?]\s+)итак,/iu];
const SECTION_STOCK={hook:[/—\s*а там(?!\p{L})/iu,/(?:свободн\p{L}* микрофон|лайфхак выходного дня|разбор недели|итоги недели|золотой фонд|ии недели|жизнь за границей)\s*:/iu],huevo:[/^чтобы(?!\p{L})/iu]};
const KNOWN_ERRORS=[[/полл[уy]н\p{L}*/iu,'spelling','Write «пол-луны» with a hyphen.'],[/стар\p{L}+-добр\p{L}+/iu,'spelling','Write «старый добрый» without a hyphen.'],[/меньше\s+\p{L}+\s+больше чем/iu,'wrong-phrase','Say «более чем в N раз меньше (слабее)».'],[/(?<!\p{L})чтобы\s+(?:\p{L}+\s+){0,2}ни\s+(?:происходил|случил|говорил|делал)\p{L}*/iu,'spelling','Write «что бы ни …» as two words.']];
const section=(d,s)=>s==='body'?d.body.join('\n\n'):d[s];
export function check(d,{history=[],flagged=[],unresolved=[],previous=null,blocked=false}={}){
 const issues=[],add=(category,section,quote,problem,fix)=>issues.push({category,section,quote,problem,fix});
 // Echo detection: a repair that leaves a quoted defect (or the whole text) unchanged goes straight back to the writer.
 if((blocked||unresolved.length)&&previous!==null&&render(d)===previous)add('format','','','The text is unchanged since the last review although it had blocking findings.','Apply every listed fix.');
 // Punctuation, hyphens, case and ё stay significant here: a corrected comma is a fix, not an echo.
 const exact=s=>String(s??'').replace(/\s+/g,' ').trim(),text=exact(render(d));
 for(const i of unresolved){const q=exact(i.quote);if((q.includes(' ')?q.length>=6:q.length>=7)&&text.includes(q)){const [s]=locate(d,i);add(i.category,s||'',i.quote,`Still present after the repair: ${i.problem}`,i.fix);}}
 for(const s of ['hook','pizdato','huevo','wisdom'])if(!d[s])add('format',s,'',`The ${s} section is empty.`,`Write the ${s} section.`);
 const [minP,maxP]=LIMITS.paragraphs;
 if(d.body.length<minP||d.body.length>maxP)add('format','body','',`The story has ${d.body.length} paragraphs; it needs ${minP}–${maxP}.`,`Write ${minP}–${maxP} short story paragraphs.`);
 const caption=render(d),chars=[...caption].length;
 if(chars>LIMITS.chars||caption.length>LIMITS.utf16)issues.push({category:'format',section:'body',sections:['hook','body'],quote:'',problem:`The rendered caption is ${chars} characters; the limit is ${LIMITS.chars} including the fixed Пиздато/Хуёво/Мудрость дня lines and CTA.`,fix:`Shorten the hook and story paragraphs by at least ${chars-LIMITS.chars} characters (aim for about ${LIMITS.chars-100} in total); the verdicts, wisdom and CTA stay as they are.`});
 const urls=d.supporting_urls??[];
 if(!Array.isArray(urls)||urls.length>10||urls.some(u=>typeof u!=='string'||!/^https:\/\/\S+$/i.test(u)))issues.push({category:'format',section:'',sections:[],quote:'',problem:'Supporting URLs must be at most ten absolute HTTPS addresses of fetched evidence.',fix:'Keep only fetched https:// URLs, at most ten.'});
 const n=words(d.wisdom).length,[minW,maxW]=LIMITS.wisdom;
 if(d.wisdom&&(n<minW||n>maxW))add('format','wisdom',d.wisdom,`The wisdom has ${n} words; it must have ${minW}–${maxW}.`,`Pick a ${minW}–${maxW}-word option or write a new natural punchline; do not pad it.`);
 if(d.wisdom&&recentWisdoms(history).some(w=>sameWisdom(w,d.wisdom)))add('repetition','wisdom',d.wisdom,'The wisdom repeats a confirmed publication.','Write a new wisdom.');
 else if(d.wisdom&&flagged.some(w=>sameWisdom(w,d.wisdom)))add('wisdom','wisdom',d.wisdom,'This wisdom was already rejected for this edition.','Write a different wisdom.');
 const prose=['hook','body','pizdato','huevo','wisdom'].map(s=>section(d,s)).join('\n');
 if(!PERSONA.test(prose))add('format','body','','Uncle Misha (дядя Миша) is not mentioned.','Add one third-person remark by дядя Миша where it adds to the joke.');
 for(const s of SECTIONS){
  const text=section(d,s)||'';
  // Real people's direct speech is quoted verbatim, so first-person and stock checks skip «…» spans.
  const own=unquoted(text);
  const fp=own.match(FIRST_PERSON);if(fp)add('ai-slop',s,fp[0],'First-person narration is not allowed.','Rewrite in the third person.');
  if(LINK.test(text))add('format',s,text.match(LINK)[0],'Sections must not contain links or mentions; the host adds the only link in the CTA.','Remove the link.');
  for(const re of [...STOCK,...(SECTION_STOCK[s]||[])]){const m=own.match(re);if(m)add('ai-slop',s,m[0].replace(/^[.!?\s]+/u,'').trim(),'Stock phrase that reads as machine-written filler.','Replace it with a concrete detail from the story.');}
  for(const [re,category,fix] of KNOWN_ERRORS){const m=text.match(re);if(m)add(category,s,m[0],'A recurring language error.',fix);}
 }
 const mentions=prose.match(new RegExp(PERSONA.source,'giu'))||[];
 if(mentions.length>2)add('ai-slop','','',`Uncle Misha is mentioned ${mentions.length} times; three times or more reads like a sticker.`,'Keep one or two mentions with a concrete opinion.');
 if((prose.match(/\p{Extended_Pictographic}/gu)||[]).length>1)add('ai-slop','','','More than one emoji in the text.','Use at most one emoji, only where it adds meaning.');
 return issues;
}
export function chooseWisdom(d,{flagged=[],history=[]}={}){
 const recent=recentWisdoms(history),[minW,maxW]=LIMITS.wisdom;
 const ok=w=>{const n=words(w).length;return n>=minW&&n<=maxW&&!flagged.some(f=>sameWisdom(f,w))&&!recent.some(r=>sameWisdom(r,w));};
 return ok(d.wisdom)?d.wisdom:(d.wisdom_options||[]).find(ok)??d.wisdom;
}
export function locate(d,issue){
 if(Array.isArray(issue.sections))return issue.sections.filter(s=>SECTIONS.includes(s));
 if(SECTIONS.includes(issue.section))return [issue.section];
 const raw=String(issue.quote??''),whole=key(unlabel(raw.replace(/^[«"„“]+|[»"“”]+$/gu,'')));
 // A quote may span sections or carry labels; long fragments still locate it. Matching respects word boundaries.
 const fragments=whole.length>=3?[whole,...raw.split(/[.!?;:—\n«»]+/u).map(f=>key(unlabel(f))).filter(f=>f.length>=12)]:[];
 return SECTIONS.filter(s=>{const hay=` ${key(section(d,s))} `;return fragments.some(f=>hay.includes(` ${f} `));});
}
// Unlocated findings unlock everything: a vague finding must not be impossible to fix.
export function sectionsFor(d,issues){
 const found=new Set(issues.flatMap(i=>{const hits=locate(d,i);return hits.length||Array.isArray(i.sections)?hits:SECTIONS;}));
 return SECTIONS.filter(s=>found.has(s));
}
export function merge(previous,next,unlocked){
 const out={...previous,image_url:next.image_url||previous.image_url,supporting_urls:next.supporting_urls??previous.supporting_urls,wisdom_options:next.wisdom_options?.length?next.wisdom_options:previous.wisdom_options};
 for(const s of unlocked)out[s]=next[s];
 return out;
}
