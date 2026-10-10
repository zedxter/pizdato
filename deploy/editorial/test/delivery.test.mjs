import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {EditionStore} from '../../evening/store.mjs';
import {tick} from '../../evening/worker.mjs';
import {render} from '../../evening/compose.mjs';
import {proofreaderOptions,verifierOptions} from '../gate.mjs';
const when=new Date('2026-10-09T16:00:00Z');
const wisdom='Если долго искать потерянный носок, можно случайно найти смысл жизни под диваном';
const sections={hook:'Будильник зазвонил на час раньше обычного.',body:['Дядя Миша проверил: батарейка жива, а стрелки убежали вперёд.','Производитель признал брак всей партии.'],pizdato:'никто в доме не проспал.',huevo:'весь подъезд проснулся в пять утра.',wisdom,wisdom_options:[],source_url:'https://source.test/story',image_url:'https://source.test/cover.jpg',supporting_urls:[]};
const draft={...sections,category:'Пятница — свободный микрофон',caption:render(sections)};
const issue=(category,quote,problem='Defect')=>({category,quote,problem,fix:'Fix it'});
const approve={issues:[]};
async function fixture(fn) {
 const root=await mkdtemp(join(tmpdir(),'evening-delivery-'));
 try {const store=new EditionStore(join(root,'state'));await store.initialize('2026-10-09');await fn({root,store,vault:join(root,'vault')});}finally{await rm(root,{recursive:true,force:true});}
}
function services({review=async()=>approve,proofread=async()=>approve,verify=()=>true,send=async()=>({message_id:55,chat:{id:-1004350521393}}),prepare}={}) {
 const calls={prepare:[],review:[],proofread:[],verify:[]};
 return {calls,history:async()=>[],
  prepare:async args=>{calls.prepare.push(JSON.parse(JSON.stringify({draft:args.edition.draft,blockers:args.edition.blockers,suggestions:args.edition.suggestions,unlocked:args.edition.unlocked,flagged:args.edition.flaggedWisdoms})));return prepare?prepare(args,calls.prepare.length):{...sections,huevo:`весь подъезд проснулся в ${args.edition.revision+5} утра.`};},
  verify:async d=>({sources:{primary:{url:d.source_url,text:'Verified alarm clock story'},supporting:[]},media:{hash:'cover-hash',url:d.image_url}}),
  review:async(messages,options)=>{const input=JSON.parse(messages[1].content);if(options===verifierOptions){calls.verify.push(input);return {content:JSON.stringify({verdicts:input.claims.map(c=>({id:c.id,real:verify(c),category:c.category,ground:verify(c)?'confirmed':'taste',reason:'checked'}))})};}if(options===proofreaderOptions){calls.proofread.push(input);return {content:JSON.stringify(await proofread(input))};}calls.review.push(input);return {content:JSON.stringify(await review(input))};},
  send,check:async()=>{}};
}
test('blocker repairs continue across fresh activations and one approved payload is sent once',async()=>fixture(async({store,vault})=>{
 let sends=0;
 const deps=services({review:async c=>c.current.revision<3?{issues:[issue('grammar','весь подъезд проснулся','Agreement')]}:approve,send:async()=>{sends++;return {message_id:55,chat:{id:-1004350521393}};}});
 for(let i=0;i<4;i++) {
  await tick({store:new EditionStore(store.root),vault,now:new Date(+when+i*300000),deps});
  const e=await store.get('2026-10-09');
  if(i<3){assert.equal(e.phase,'repairing');assert.equal(e.revision,i+1);assert.match(e.findings[0],/Agreement/);assert.equal(sends,0);}
 }
 assert.equal(sends,1);assert.equal((await store.get('2026-10-09')).phase,'published');
 await tick({store,vault,now:new Date(+when+4000000),deps});assert.equal(sends,1);
 assert.match(await readFile(join(vault,'published/telegram/evening-2026-10-09.md'),'utf8'),/55/);
 assert.match(await readFile(join(vault,'posts/evening-2026-10-09.md'),'utf8'),/Мир ждёт твоего голоса: https:\/\/pizdato\.net/);
}));
test('a story still blocked after four repairs is replaced by a different verified story',async()=>fixture(async({store,vault})=>{
 const deps=services({
  review:async c=>c.source.primary.url.endsWith('/story')?{issues:[issue('wrong-phrase','весь подъезд','Unidiomatic')]}:approve,
  prepare:async({edition})=>edition.abandoned.includes('https://source.test/story')?{...sections,source_url:'https://source.test/other',hook:'Совсем другая новость про будильник.'}:{...sections,huevo:`весь подъезд проснулся в ${edition.revision+5} утра.`}
 });
 for(let i=0;i<6;i++) await tick({store,vault,now:new Date(+when+i*300000),deps});
 const e=await store.get('2026-10-09');
 assert.equal(e.phase,'published');assert.deepEqual(e.abandoned,['https://source.test/story']);
 assert.deepEqual(deps.calls.review.map(r=>[r.current.story,r.current.revision]),[[1,0],[1,1],[1,2],[1,3],[1,4],[2,0]]);
 assert.ok(deps.calls.review[5].abandonedStories[0].text.includes('Будильник зазвонил'));
}));
test('suggestions never block and get exactly one polishing pass',async()=>fixture(async({store,vault})=>{
 const deps=services({review:async c=>({issues:c.current.revision===0?[issue('grammar','весь подъезд','Agreement'),issue('humor','никто в доме не проспал','Could be sharper')]:[issue('style','Будильник','Optional')]})});
 await tick({store,vault,now:when,deps});
 const e=await store.get('2026-10-09');
 assert.equal(e.phase,'repairing');assert.equal(e.suggestions.length,1);assert.deepEqual([...e.unlocked].sort(),['huevo','pizdato']);
 await tick({store,vault,now:new Date(+when+300000),deps});
 assert.equal((await store.get('2026-10-09')).phase,'published');
 assert.equal(deps.calls.prepare[1].suggestions.length,1);
}));
test('repairs change only flagged sections and keep the rest byte-identical',async()=>fixture(async({store,vault})=>{
 let sent;
 const deps=services({
  review:async c=>c.current.revision===0?{issues:[issue('grammar','весь подъезд проснулся в пять утра','Agreement')]}:approve,
  prepare:async(_,n)=>n===1?{...sections}:{...sections,hook:'Writer rewrote the hook anyway.',huevo:'проснулись все соседи сразу.'},
  send:async d=>{sent=d.caption;return {message_id:56,chat:{id:-1004350521393}};}
 });
 await tick({store,vault,now:when,deps});await tick({store,vault,now:new Date(+when+300000),deps});
 assert.ok(sent.startsWith(sections.hook),sent);assert.match(sent,/Хуёво: проснулись все соседи сразу\./);
 assert.deepEqual(deps.calls.prepare[1].unlocked,['huevo']);assert.match(JSON.stringify(deps.calls.prepare[1].blockers),/Agreement/);
}));
test('mechanical defects are repaired inside the same activation before editorial review',async()=>fixture(async({store,vault})=>{
 const deps=services({prepare:async(_,n)=>n===1?{...sections,wisdom:'Короткая мудрость',wisdom_options:[]}:{...sections}});
 await tick({store,vault,now:when,deps});
 assert.equal((await store.get('2026-10-09')).phase,'published');assert.equal(deps.calls.prepare.length,2);assert.equal(deps.calls.review.length,1);
 assert.deepEqual(deps.calls.prepare[1].unlocked,['wisdom']);assert.match(JSON.stringify(deps.calls.prepare[1].blockers),/2 words/);
}));
test('host chooses a brainstormed wisdom that fits instead of bouncing the draft',async()=>fixture(async({store,vault})=>{
 const deps=services({prepare:async()=>({...sections,wisdom:'Коротко',wisdom_options:['Коротко',wisdom]})});
 await tick({store,vault,now:when,deps});
 assert.equal(deps.calls.prepare.length,1);assert.equal((await store.get('2026-10-09')).draft.wisdom,wisdom);
}));
test('unfixable mechanical defects yield to the next tick after three drafts',async()=>fixture(async({store,vault})=>{
 const deps=services({prepare:async()=>({...sections,wisdom:'Всё равно коротко'})});
 const e=await tick({store,vault,now:when,deps});
 assert.equal(e.phase,'repairing');assert.equal(deps.calls.prepare.length,3);assert.equal(deps.calls.review.length,0);assert.equal(e.nextAttemptAt,+when+300000);
}));
test('flagged wisdom is not offered again for the same edition',async()=>fixture(async({store,vault})=>{
 const other='Будильник, который спешит на час, честнее любого прогноза погоды и календаря';
 const deps=services({review:async c=>c.current.revision===0?{issues:[issue('grammar',wisdom,'Agreement')]}:approve,prepare:async(_,n)=>n===1?{...sections}:{...sections,wisdom:n===2?wisdom:other}});
 await tick({store,vault,now:when,deps});await tick({store,vault,now:new Date(+when+300000),deps});
 const e=await store.get('2026-10-09');
 assert.equal(e.phase,'published');assert.equal(e.draft.wisdom,other);assert.deepEqual(e.flaggedWisdoms,[wisdom]);
 assert.equal(deps.calls.prepare.length,3,'the repeated wisdom is bounced by the host before another editor call');assert.equal(deps.calls.review.length,2);
}));
test('a repair is reviewed fresh with only its changed sections named',async()=>fixture(async({store,vault})=>{
 const deps=services({review:async c=>c.current.revision===0?{issues:[issue('grammar','весь подъезд проснулся в пять утра','Agreement')]}:approve,prepare:async(_,n)=>n===1?{...sections}:{...sections,huevo:'проснулись все соседи сразу.'}});
 await tick({store,vault,now:when,deps});await tick({store,vault,now:new Date(+when+300000),deps});
 assert.equal(deps.calls.review[0].changedSections,undefined);assert.deepEqual(deps.calls.review[1].changedSections,['huevo']);
 assert.ok(!JSON.stringify(deps.calls.review[1]).includes('Agreement'),'earlier findings are not shown to the editor');
 assert.deepEqual(deps.calls.proofread.map(p=>Object.keys(p)),[['candidate'],['candidate']]);
}));
test('a proofreader spelling blocker is repaired like any other blocker',async()=>fixture(async({store,vault})=>{
 const deps=services({proofread:async c=>c.candidate.includes('поллуны')?{issues:[issue('spelling','поллуны','Write пол-луны')]}:approve,prepare:async(_,n)=>n===1?{...sections,pizdato:'кратер в поллуны не помешал.'}:{...sections,pizdato:'кратер в пол-луны не помешал.'}});
 await tick({store,vault,now:when,deps});await tick({store,vault,now:new Date(+when+300000),deps});
 const e=await store.get('2026-10-09');assert.equal(e.phase,'published');assert.match(e.draft.caption,/пол-луны/);
}));
test('an echoed unrepaired blocker goes back to the writer before another review',async()=>fixture(async({store,vault})=>{
 const deps=services({review:async c=>c.current.revision===0?{issues:[issue('grammar','весь подъезд проснулся в пять утра','Agreement')]}:approve,prepare:async(_,n)=>n<=2?{...sections}:{...sections,huevo:'проснулись все соседи сразу.'}});
 await tick({store,vault,now:when,deps});await tick({store,vault,now:new Date(+when+300000),deps});
 assert.equal((await store.get('2026-10-09')).phase,'published');assert.equal(deps.calls.prepare.length,3);assert.equal(deps.calls.review.length,2);
 assert.match(JSON.stringify(deps.calls.prepare[2].blockers),/Still present/);
}));
test('replacing a story clears its evidence, raw draft and search allowance',async()=>fixture(async({store,vault})=>{
 const deps=services({review:async()=>({issues:[issue('repetition','Будильник','Already published')]})});
 await store.enqueue(when);const e0=await store.get('2026-10-09');Object.assign(e0,{searches:['a','b','c']});await store.save(e0);
 await tick({store,vault,now:when,deps});
 const e=await store.get('2026-10-09');
 assert.equal(e.phase,'discovering');assert.equal(e.draft,null);assert.equal(e.evidence,undefined);assert.equal(e.rawDraft,undefined);assert.deepEqual(e.searches,[]);
}));
test('a story that keeps failing mechanical checks is replaced instead of looping until the deadline',async()=>fixture(async({store,vault})=>{
 const deps=services({prepare:async({edition})=>edition.abandoned.includes(sections.source_url)?{...sections,source_url:'https://source.test/other'}:{...sections,wisdom:'Коротко'}});
 for(let i=0;i<4;i++)await tick({store,vault,now:new Date(+when+i*300000),deps});
 const e=await store.get('2026-10-09');
 assert.deepEqual(e.abandoned,[sections.source_url]);assert.equal(e.phase,'published');assert.equal(deps.calls.review.length,1);
}));
test('a legacy-format publication marker closes its edition instead of stopping the worker',async()=>fixture(async({store,vault})=>{
 await durableWrite(join(vault,'published/telegram/evening-2026-10-09.md'),'# evening — 2026-10-09 — опубликовано\n\n- **message_id:** 165 · https://t.me/pizdato_net/165 · 2026-10-09 18:00 CEST\n');
 await durableWrite(join(vault,'posts/evening-2026-10-09.md'),'manual archive');
 let sends=0;await tick({store,vault,now:when,deps:services({send:async()=>{sends++;}})});
 assert.equal((await store.get('2026-10-09')).phase,'published');assert.equal(sends,0);
}));
test('a second blocked check keeps the phase to resume',async()=>fixture(async({store,vault})=>{
 const deps=services();deps.verify=async()=>{throw Object.assign(new Error('Named account inactive'),{blocked:true});};
 await tick({store,vault,now:when,deps});
 let e=await store.get('2026-10-09');assert.equal(e.phase,'blocked');assert.equal(e.resumePhase,'reviewing');
 deps.check=async()=>{throw Object.assign(new Error('still inactive'),{blocked:true});};
 await tick({store,vault,now:new Date(+when+3600000),deps});
 e=await store.get('2026-10-09');assert.equal(e.phase,'blocked');assert.equal(e.resumePhase,'reviewing');
}));
test('a blocker dismissed by the verifier does not cost the story a repair',async()=>fixture(async({store,vault})=>{
 const deps=services({review:async()=>({issues:[issue('unsupported-claim','Производитель признал брак','Pedantic paraphrase complaint')]}),verify:()=>false});
 await tick({store,vault,now:when,deps});
 const e=await store.get('2026-10-09');assert.equal(e.phase,'published');assert.equal(deps.calls.verify.length,1);
}));
test('a byte-identical resubmission never reaches the editor as already reviewed',async()=>fixture(async({store,vault})=>{
 const deps=services({review:async c=>c.current.revision===0?{issues:[issue('grammar','весь подъезд проснулся в пять утра','Agreement')]}:approve,prepare:async()=>({...sections})});
 await tick({store,vault,now:when,deps});
 for(let i=1;i<=3;i++)await tick({store,vault,now:new Date(+when+i*300000),deps});
 assert.equal(deps.calls.review.length,1,'the unchanged text is bounced by the host every time');
 const e=await store.get('2026-10-09');assert.notEqual(e.phase,'published');
}));
test('sections blocked in the previous review are always re-reviewed as changed',async()=>fixture(async({store,vault})=>{
 const deps=services({review:async c=>c.current.revision===0?{issues:[issue('grammar','весь подъезд проснулся в пять утра','Agreement'),issue('meaning','Производитель признал брак всей партии','Contradiction')]}:approve,
  prepare:async(_,n)=>n===1?{...sections}:{...sections,huevo:'проснулись все соседи сразу.',body:[sections.body[0],'Производитель признал брак.']}});
 await tick({store,vault,now:when,deps});await tick({store,vault,now:new Date(+when+300000),deps});
 assert.deepEqual(deps.calls.review[1].changedSections,['body','huevo']);
}));
test('a taste remark on the wisdom never forbids it, and category suggestions are not sent to the writer',async()=>fixture(async({store,vault})=>{
 const deps=services({review:async c=>c.current.revision===0?{issues:[issue('grammar','весь подъезд проснулся в пять утра','Agreement'),issue('wisdom',wisdom,'Predictable'),issue('category','Будильник','Not a life hack')]}:approve,
  prepare:async(_,n)=>n===1?{...sections}:{...sections,huevo:'проснулись все соседи сразу.'}});
 await tick({store,vault,now:when,deps});
 const e=await store.get('2026-10-09');assert.deepEqual(e.flaggedWisdoms,[]);assert.deepEqual(e.suggestions.map(i=>i.category),['wisdom']);
}));
test('persistently failing source checks replace the story instead of waiting for the deadline',async()=>fixture(async({store,vault})=>{
 const deps=services({prepare:async({edition})=>edition.abandoned.includes(sections.source_url)?{...sections,source_url:'https://source.test/other'}:{...sections}});
 deps.verify=async d=>{if(d.source_url===sections.source_url)throw Object.assign(new Error('getaddrinfo ENOTFOUND'),{verifyFailure:true});return {sources:{primary:{url:d.source_url,text:'ok'},supporting:[]},media:{hash:'h',url:d.image_url}};};
 for(let i=0;i<6;i++){const e=await store.get('2026-10-09').catch(()=>null);await tick({store,vault,now:new Date(+when+i*3600000/2),deps});}
 const e=await store.get('2026-10-09');assert.deepEqual(e.abandoned,[sections.source_url]);assert.equal(e.phase,'published');
}));
test('a review that keeps failing on the same text replaces the story',async()=>fixture(async({store,vault})=>{
 const deps=services({prepare:async({edition})=>edition.abandoned.includes(sections.source_url)?{...sections,source_url:'https://source.test/other'}:{...sections}});
 const review=deps.review;deps.review=async(m,o)=>JSON.parse(m[1].content).source?.primary?.url===sections.source_url&&o!==proofreaderOptions&&o!==verifierOptions?{content:'not json'}:review(m,o);
 for(let i=0;i<8;i++)await tick({store,vault,now:new Date(+when+i*3600000/2),deps});
 const e=await store.get('2026-10-09');assert.deepEqual(e.abandoned,[sections.source_url]);assert.equal(e.phase,'published');
}));
test('the deadline is checked again right before the send intent',async()=>fixture(async({store,vault})=>{
 let sends=0;const deps=services({send:async()=>{sends++;return {message_id:55,chat:{id:-1004350521393}};}});
 deps.ready=async()=>{await new Promise(r=>setTimeout(r,20));};
 const e=await tick({store,vault,now:new Date(+deadlineAt('2026-10-09')-10),deps});
 assert.equal(sends,0);assert.equal((await store.get('2026-10-09')).phase,'cancelled');
}));
test('delivery waits for a later activation when too little time is left to send safely',async()=>fixture(async({store,vault})=>{
 let sends=0;const deps=services({send:async()=>{sends++;return {message_id:55,chat:{id:-1004350521393}};}});deps.canSend=()=>false;
 await tick({store,vault,now:when,deps});
 const e=await store.get('2026-10-09');assert.equal(sends,0);assert.equal(e.phase,'ready');assert.equal(e.intent,undefined);
}));
test('an abandoned source returned by the writer is not drafted again',async()=>fixture(async({store,vault})=>{
 await store.enqueue(when);const e0=await store.get('2026-10-09');e0.abandoned=[sections.source_url];await store.save(e0);
 const deps=services();await tick({store,vault,now:when,deps});
 const e=await store.get('2026-10-09');assert.equal(e.phase,'discovering');assert.equal(e.draft,null);assert.equal(deps.calls.review.length,0);
}));
test('validation records identify story, revision and unlocked sections, and expiry is reported',async()=>fixture(async({store,vault})=>{
 const deps=services({prepare:async(_,n)=>n===1?{...sections,wisdom:'Коротко'}:{...sections}});
 await tick({store,vault,now:when,deps});
 const {readdir}=await import('node:fs/promises');
 const records=await Promise.all((await readdir(join(store.root,'reviews'))).map(async n=>JSON.parse(await readFile(join(store.root,'reviews',n),'utf8'))));
 const v=records.find(r=>r.kind==='validation');assert.equal(v.story,1);assert.equal(v.revision,0);assert.deepEqual(v.unlocked,['wisdom']);
 const blocking=services({review:async()=>({issues:[issue('meaning','весь подъезд','x')]})});
 await fixture(async f=>{await tick({store:f.store,vault:f.vault,now:when,deps:blocking});const r=await tick({store:f.store,vault:f.vault,now:new Date('2026-10-09T21:05:00Z'),deps:blocking});assert.deepEqual(r.expired,['2026-10-09']);});
}));
test('a re-review after a history change is a full review',async()=>fixture(async({store,vault})=>{
 let calls=0;const deps=services();deps.history=async()=>++calls===1?[]:[{text:'Morning publication'}];
 await tick({store,vault,now:when,deps});deps.history=async()=>[{text:'Morning publication'}];
 await tick({store,vault,now:new Date(+when+300000),deps});
 assert.equal(deps.calls.review[1].changedSections,undefined);
}));
test('every marker grammar accepted by confirmed history closes its edition',async()=>fixture(async({store,vault})=>{
 await durableWrite(join(vault,'published/telegram/evening-2026-10-09.md'),'# evening-2026-10-09\n\n- **Канал:** @pizdato_net (`-1004350521393`)\n- **message_id:** 140\n');
 await durableWrite(join(vault,'posts/evening-2026-10-09.md'),'manual archive');
 let sends=0;await tick({store,vault,now:when,deps:services({send:async()=>{sends++;}})});
 assert.equal((await store.get('2026-10-09')).phase,'published');assert.equal(sends,0);
}));
test('a Telegram rejection of the payload replaces the story instead of resending it all evening',async()=>fixture(async({store,vault})=>{
 let sends=0;const deps=services({send:async()=>{sends++;throw Object.assign(new Error('Telegram rejected request'),{definiteNonDelivery:true,replace:true,safeMessage:'Telegram rejected the photo or caption'});}});
 await tick({store,vault,now:when,deps});
 const e=await store.get('2026-10-09');assert.equal(sends,1);assert.equal(e.phase,'discovering');assert.deepEqual(e.abandoned,[sections.source_url]);
}));
test('a blocker that quotes only host-owned text is ignored',async()=>fixture(async({store,vault})=>{
 const deps=services({review:async()=>({issues:[issue('ai-slop','Мир ждёт твоего голоса: https://pizdato.net','Promotional CTA')]})});
 await tick({store,vault,now:when,deps});
 assert.equal((await store.get('2026-10-09')).phase,'published');
}));
test('routine continuation runs on the next five-minute cron tick despite jitter',async()=>fixture(async({store,vault})=>{
 const deps=services({review:async c=>c.current.revision===0?{issues:[issue('grammar','весь подъезд','Agreement')]}:approve});
 await tick({store,vault,now:new Date(+when+1500),deps});
 const second=await tick({store,vault,now:new Date(+when+300400),deps});
 assert.equal(second.phase,'published');
}));
test('an unapproved edition expires at 23:00 Berlin, is never sent and stays visible',async()=>fixture(async({store,vault})=>{
 let sends=0;
 const blocking=services({review:async()=>({issues:[issue('meaning','весь подъезд','Contradiction')]}),send:async()=>{sends++;}});
 await tick({store,vault,now:when,deps:blocking});
 const expired=await tick({store,vault,now:new Date('2026-10-09T21:00:00Z'),deps:services({send:async()=>{sends++;}})});
 assert.equal(expired.phase,'idle');assert.equal(sends,0);
 const e=await store.get('2026-10-09');assert.equal(e.phase,'cancelled');assert.equal(e.cancellation.automatic,true);assert.match(e.cancellation.reason,/deadline/i);
 assert.equal((await status(store,new Date('2026-10-09T21:00:00Z')))[0].phase,'cancelled');
}));
test('expiry never touches uncertain or confirmed deliveries',async()=>fixture(async({store,vault})=>{
 await tick({store,vault,now:when,deps:services({send:async()=>{throw new Error('timeout');}})});
 await tick({store,vault,now:new Date('2026-10-09T22:00:00Z'),deps:services()});
 assert.equal((await store.get('2026-10-09')).phase,'delivery-unknown');
}));
test('dry runs are not cancelled by the deadline',async()=>fixture(async({store,vault})=>{
 const e=await tick({store,vault,now:new Date('2026-10-09T22:30:00Z'),deps:services(),dryRun:true});
 assert.equal(e.dryRun,true);assert.equal(e.phase,'ready');
}));
test('legacy caption-only draft is rewritten from its retained source',async()=>fixture(async({store,vault})=>{
 await store.enqueue(when);const e=await store.get('2026-10-09');
 Object.assign(e,{phase:'repairing',draft:{caption:'old caption',wisdom,source_url:sections.source_url,image_url:sections.image_url},findings:['old finding']});await store.save(e);
 const deps=services();await tick({store,vault,now:when,deps});
 assert.equal(deps.calls.prepare[0].draft,null);assert.equal((await store.get('2026-10-09')).phase,'published');
}));
test('invalid writer output is retried before review and then published',async()=>fixture(async({store,vault})=>{
 const deps=services({prepare:async(_,n)=>n===1?{...sections,body:[]}:{...sections}});
 await tick({store,vault,now:when,deps});assert.equal((await store.get('2026-10-09')).phase,'published');
}));
test('unknown send is never automatically retried',async()=>fixture(async({store,vault})=>{
 let sends=0;const deps=services({send:async()=>{sends++;throw new Error('timeout');}});
 await tick({store,vault,now:when,deps});assert.equal((await store.get('2026-10-09')).phase,'delivery-unknown');
 await tick({store,vault,now:new Date(+when+3600000),deps});assert.equal(sends,1);
}));
test('transient malformed review retains draft and backs off then recovers',async()=>fixture(async({store,vault})=>{
 const deps=services();let calls=0;deps.review=async(m,o)=>o!==proofreaderOptions&&o!==verifierOptions?{content:++calls<=2?'invalid':JSON.stringify(approve)}:{content:JSON.stringify(approve)};
 await tick({store,vault,now:when,deps});assert.equal((await store.get('2026-10-09')).draft.caption.includes('Дядя Миша'),true);assert.equal(calls,2,'one immediate retry');
 await tick({store,vault,now:new Date(+when+1000),deps});assert.equal(calls,2);
 await tick({store,vault,now:new Date(+when+300000),deps});assert.equal((await store.get('2026-10-09')).phase,'published');
}));
test('a stuck older edition expires and cannot starve the next evening',async()=>fixture(async({store,vault})=>{
 const deps=services({review:async c=>c.source.editionDate==='2026-10-09'?{issues:[issue('grammar','весь подъезд','Fix')]}:approve});
 await tick({store,vault,now:when,deps});await tick({store,vault,now:new Date('2026-10-10T16:00Z'),deps});
 assert.equal((await store.get('2026-10-10')).phase,'published');assert.equal((await store.get('2026-10-09')).phase,'cancelled');
}));
test('history change during review defers sending for new full review',async()=>fixture(async({store,vault})=>{
 let calls=0,sends=0;const deps=services({send:async()=>{sends++;}});deps.history=async()=>++calls===1?[]:[{text:'Morning publication'}];
 await tick({store,vault,now:when,deps});assert.equal(sends,0);assert.equal((await store.get('2026-10-09')).phase,'reviewing');
}));
test('definite non-delivery retries but uncertain outcome remains blocked',async()=>fixture(async({store,vault})=>{
 const deps=services({send:async()=>{throw Object.assign(new Error('rate limit'),{definiteNonDelivery:true,retryAfterMs:7200000});}});
 await tick({store,vault,now:when,deps});const e=await store.get('2026-10-09');assert.equal(e.phase,'ready');assert.equal(e.nextAttemptAt,+when+7200000);
}));
import {dueAt,deadlineAt,durableWrite,recover,status} from '../../evening/store.mjs';
import {reconcile,cancel} from '../../evening/control.mjs';
test('confirmed receipt is finalized after crash without sending again',async()=>fixture(async({store,vault})=>{
 await store.enqueue(when);const e=await store.get('2026-10-09');Object.assign(e,{phase:'sending',draft,receipt:{message_id:66,chat:{id:-1004350521393}},sentAt:when.toISOString()});await store.save(e);
 await recover(store,vault);assert.equal((await store.get(e.day)).phase,'published');await recover(store,vault);
 assert.match(await readFile(join(vault,'posts/evening-2026-10-09.md'),'utf8'),/66/);
}));
test('DST due times, deadlines and missing days keep their original identities',async()=>fixture(async({store})=>{
 assert.equal(new Date(dueAt('2026-10-24')).toISOString(),'2026-10-24T16:00:00.000Z');assert.equal(new Date(dueAt('2026-10-25')).toISOString(),'2026-10-25T17:00:00.000Z');
 assert.equal(new Date(deadlineAt('2026-10-24')).toISOString(),'2026-10-24T21:00:00.000Z');assert.equal(new Date(deadlineAt('2026-10-25')).toISOString(),'2026-10-25T22:00:00.000Z');
 await store.enqueue(new Date('2026-10-11T15:59Z'));assert.deepEqual((await store.list()).map(e=>e.day),['2026-10-09','2026-10-10']);
 const [first]=await status(store,new Date('2026-10-09T17:00Z'));assert.equal(first.overdue,true);assert.equal(first.deadline,'2026-10-09T21:00:00.000Z');
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
test('offline status exposes corrupt journals as blocked rather than hiding the edition',async()=>fixture(async({store})=>{
 await durableWrite(store.path('2026-10-09'),'{broken');
 const entries=await status(store,when);assert.equal(entries[0].phase,'blocked');assert.match(entries[0].error,/journal/i);
}));
import {cp,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const configError=()=>Object.assign(new Error('EDITORIAL_CONFIG: profile pizdato-channel lacks slot editorRole used by editor.template.md'),{code:'EDITORIAL_CONFIG'});
test('a broken profile in an installed release stops the activation and consumes no story',async()=>fixture(async({root,store,vault})=>{
 const release=join(root,'release');
 for(const dir of ['evening','editorial'])await cp(resolve(`deploy/${dir}`),join(release,dir),{recursive:true,filter:path=>!path.includes(`${dir}/test`)});
 const profile=join(release,'editorial/profiles/pizdato-channel.mjs');
 await writeFile(profile,(await readFile(profile,'utf8')).replace('  editorRole:','  editorRoleRenamed:'));
 const {tick:brokenTick}=await import(pathToFileURL(join(release,'evening/worker.mjs')).href);
 const deps=services();
 for(let i=0;i<4;i++)await brokenTick({store,vault,now:new Date(+when+i*300000),deps});
 const e=await store.get('2026-10-09');
 assert.match(e.lastError,/EDITORIAL_CONFIG.*editorRole/);assert.equal(deps.calls.prepare.length,0);assert.equal(deps.calls.review.length,0);
 assert.deepEqual(e.abandoned,[]);assert.equal(e.reviewFailures||0,0);assert.equal(e.failures||0,0);assert.equal(e.gate,undefined);assert.equal(e.nextAttemptAt,+when+3*300000+300000);
}));
test('a structurally broken profile is recorded as a configuration error, not an import crash',async()=>fixture(async({root,store,vault})=>{
 const release=join(root,'release');
 for(const dir of ['evening','editorial'])await cp(resolve(`deploy/${dir}`),join(release,dir),{recursive:true,filter:path=>!path.includes(`${dir}/test`)});
 const profile=join(release,'editorial/profiles/pizdato-channel.mjs'),text=await readFile(profile,'utf8');
 assert.ok(text.includes("suggestions:Object.freeze(['wisdom'])"));
 await writeFile(profile,text.replace("suggestions:Object.freeze(['wisdom'])",'suggestions:null'));
 const {tick:brokenTick}=await import(pathToFileURL(join(release,'evening/worker.mjs')).href);
 const deps=services();
 for(let i=0;i<2;i++)await brokenTick({store,vault,now:new Date(+when+i*300000),deps});
 const e=await store.get('2026-10-09');
 assert.match(e.lastError,/EDITORIAL_CONFIG.*suggestion/);assert.equal(deps.calls.prepare.length,0);assert.equal(deps.calls.review.length,0);
 assert.deepEqual(e.abandoned,[]);assert.equal(e.reviewFailures||0,0);assert.equal(e.failures||0,0);
}));
test('a configuration error raised mid-activation is not a reviewer failure and keeps the story',async()=>fixture(async({store,vault})=>{
 let broken=true;const deps=services({prepare:async()=>{if(broken)throw configError();return {...sections};}});
 for(let i=0;i<4;i++)await tick({store,vault,now:new Date(+when+i*300000),deps});
 let e=await store.get('2026-10-09');
 assert.match(e.lastError,/EDITORIAL_CONFIG/);assert.deepEqual(e.abandoned,[]);assert.equal(e.failures||0,0);assert.equal(e.reviewFailures||0,0);
 const review=deps.review;deps.review=async(m,o)=>{if(o!==proofreaderOptions&&o!==verifierOptions&&!broken)throw configError();return review(m,o);};
 broken=false;for(let i=4;i<8;i++)await tick({store,vault,now:new Date(+when+i*300000),deps});
 e=await store.get('2026-10-09');assert.equal(e.phase,'reviewing');assert.equal(e.reviewFailures||0,0);assert.deepEqual(e.abandoned,[]);assert.match(e.lastError,/EDITORIAL_CONFIG/);
}));
