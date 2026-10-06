import {readFile, readdir, mkdir, writeFile, unlink} from 'node:fs/promises';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEnv, Composio, unpack, chat, atomicWrite, confirmedReceipt} from './transport.mjs';
const ROOT=dirname(fileURLToPath(import.meta.url));
const CHAT=-1004350521393, ACCOUNT='pizdato-net-channel';
const normalized=s=>s.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function validateWisdom(wisdom, recent=[]) {
  if(typeof wisdom!=='string'||/[\r\n«»"]|\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(wisdom)) throw new Error('Expected a single wisdom sentence without extra sections or quotation marks');
  const words=wisdom.match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)||[];
  if(words.length<10||words.length>15) throw new Error('Wisdom must contain 10–15 words');
  if(/https?|www|pizdato|[\p{L}\p{N}]+\.[\p{L}]{2,}|\d|голосов|голосован|проголос|голосуй|статист|подпис|ссылк|доброе утро|мир жд[её]т|🔥|💀/iu.test(wisdom)) throw new Error('Links, promotion, stats, voting, greetings and reaction prompts are prohibited');
  if(/(?:^|[^\p{L}])(?:я|мы|мой|моя|мои|наш|наша|наши|нам|нас|мне|меня|желаю|хочу|надеюсь|советую|думаю|вижу|считаю|наш[её]л)(?:[^\p{L}]|$)/iu.test(wisdom)) throw new Error('No first-person narration');
  if(recent.some(s=>normalized(s)===normalized(wisdom))) throw new Error('Wisdom was recently published; write a fresh thought');
  return wisdom.trim();
}
export function validateWish(wish) {
  if(typeof wish!=='string'||/[\r\n«»"]|\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(wish)) throw new Error('Expected one short wish');
  const words=wish.match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)||[];
  if(words.length<5||words.length>25) throw new Error('Wish must contain 5–25 words');
  if(/https?|www|pizdato|[\p{L}\p{N}]+\.[\p{L}]{2,}|\d|голосов|голосован|проголос|голосуй|статист|подпис|ссылк|доброе утро|мир жд[её]т|🔥|💀/iu.test(wish)) throw new Error('No promotion, links, stats or greetings in the wish');
  if(/(?:^|[^\p{L}])(?:я|мы|мой|моя|мои|наш|наша|наши|нам|нас|мне|меня|желаю|хочу|надеюсь|советую|думаю|вижу|считаю|наш[её]л)(?:[^\p{L}]|$)/iu.test(wish)) throw new Error('No first-person wish');
  return wish.trim();
}
export const renderWisdom=(wisdom,wish='')=>`☕ Мудрость дня от дяди Миши:\n«${wisdom}»${wish ? `\n\n✨ ${wish}` : ''}`;
async function run() {
  const mode=process.argv[2]||'publish';
  if(!['publish','--dry-run','--check'].includes(mode)) throw new Error('Unknown mode');
  await loadEnv(process.env.PIZDATO_CHANNEL_ENV||join(homedir(),'.config/pizdato-channel.env'));
  await loadEnv(process.env.PIZDATO_EVENING_ENV||join(homedir(),'.config/pizdato-evening.env'));
  if(!process.env.OPENROUTER_API_KEY||!process.env.COMPOSIO_CONSUMER_KEY) throw new Error('OpenRouter or Composio credential missing');
  const vault=process.env.PIZDATO_MORNING_VAULT||'/home/danil/vault/pizdato';
  const state=process.env.PIZDATO_MORNING_STATE||join(homedir(),'.local/state/pizdato-morning');
  const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date());
  const day=today(),marker=join(vault,`published/telegram/morning-${day}.md`),pending=join(state,`morning-${day}.pending`);
  await mkdir(state,{recursive:true});
  const polish=(await Promise.all(['SKILL.md','KNOWN_PATTERNS.md','STYLE_PATTERNS.md','REFERENCE_CORRECTNESS.md'].map(n=>readFile(join(ROOT,'resources/post-polish',n),'utf8')))).join('\n\n');
  const mcp=new Composio();await mcp.connect();
  const discovery=unpack(await mcp.call('COMPOSIO_SEARCH_TOOLS',{queries:[{use_case:'Read Telegram channel metadata and send a plain text message',known_fields:`chat_id:${CHAT}, account:${ACCOUNT}`}],search_strategy:'tool_search',session:{generate_id:true}}));
  const data=discovery.data||discovery,sessionId=data.session?.id;
  if(!sessionId||!data.toolkit_connection_statuses?.some(s=>s.toolkit==='telegram'&&s.accounts?.some(a=>a.alias===ACCOUNT&&a.status==='ACTIVE'))) throw new Error('Named Telegram connection unavailable');
  const execute=async tools=>unpack(await mcp.call('COMPOSIO_MULTI_EXECUTE_TOOL',{tools,session_id:sessionId,current_step:'MORNING_WISDOM',sync_response_to_workbench:false}));
  const info=await execute([{tool_slug:'TELEGRAM_GET_CHAT',account:ACCOUNT,arguments:{chat_id:CHAT}}]);
  const channel=(info.data||info).results?.[0]?.response?.data;
  if(!channel?.ok||channel.result?.id!==CHAT||channel.result?.username!=='pizdato_net') throw new Error('Channel identity mismatch');
  const ask=messages=>chat(messages,undefined,{title:'pizdato-morning',model:process.env.PIZDATO_MORNING_MODEL||process.env.PIZDATO_EVENING_MODEL||'deepseek/deepseek-v4.1-flash',maxTokens:1000});
  if(mode==='--check') {
    const answer=await ask([{role:'user',content:'Return exactly OPENROUTER_OK. Non-publishing connection check.'}]);
    if(!answer.content?.includes('OPENROUTER_OK')) throw new Error('OpenRouter preflight failed');
    console.log('PREFLIGHT_OK: OpenRouter, named Telegram channel and polish resources verified.');return;
  }
  await mcp.call('COMPOSIO_GET_TOOL_SCHEMAS',{tool_slugs:['TELEGRAM_SEND_MESSAGE'],session_id:sessionId});
  const names=(await readdir(join(vault,'posts'))).filter(n=>/^morning-\d{4}-\d{2}-\d{2}\.md$/.test(n)).sort().slice(-30);
  const recent=(await Promise.all(names.map(async n=>[...(await readFile(join(vault,'posts',n),'utf8')).matchAll(/«([^»]+)»/gu)].map(m=>m[1])))).flat();
  const prompt=await readFile(join(ROOT,'prompt.md'),'utf8');
  const messages=[{role:'system',content:`${prompt}\nPost-polish resources:\n${polish}`},{role:'user',content:`Date: ${day}. Recent wisdom to avoid:\n${JSON.stringify(recent)}\nWrite a fresh, amusing wisdom.`}];
  const raw=await ask(messages);messages.push({role:'assistant',content:raw.content});
  messages.push({role:'user',content:'Apply post-polish (telegram/warm/ru) to this wisdom. Check wisdom 10–15 words, wish 5–25 words, wit, grammar, no promotion, no recent repetition. Return only the final JSON.'});
  let post;
  for(let attempt=0;attempt<3;attempt++) {
    const answer=await ask(messages);
    try { const candidate=JSON.parse(answer.content);post={wisdom:validateWisdom(candidate.wisdom,recent),wish:validateWish(candidate.wish)};break; }
    catch(e) { messages.push({role:'assistant',content:answer.content},{role:'user',content:`Validation failed: ${e.message}. Correct the wisdom and return only JSON.`}); }
  }
  if(!post) throw new Error('No valid wisdom and wish within generation budget');
  const text=renderWisdom(post.wisdom,post.wish),archiveText=`# Morning wisdom ${day}\n\n${text}\n`;
  if(mode==='--dry-run') {await atomicWrite(join(state,`drafts/morning-${day}.md`),archiveText);console.log(`DRY_RUN_OK\n${text}`);return;}
  if(day!==today()) throw new Error('Date changed during generation');
  try {await readFile(marker);console.log('Already published; skipping.');return;}catch(e){if(e.code!=='ENOENT')throw e;}
  const archive=join(vault,`posts/morning-${day}.md`);await atomicWrite(archive,archiveText);
  await writeFile(pending,JSON.stringify({day,account:ACCOUNT,chat_id:CHAT,archive,at:new Date().toISOString()}),{flag:'wx',mode:0o600});
  const result=await execute([{tool_slug:'TELEGRAM_SEND_MESSAGE',account:ACCOUNT,arguments:{chat_id:CHAT,text}}]);
  const receipt=confirmedReceipt((result.data||result).results?.[0]?.response);
  const receiptText=`\nMessage ID: ${receipt.message_id}\nPost: https://t.me/pizdato_net/${receipt.message_id}\nPublished: ${new Date().toISOString()}\n`;
  await atomicWrite(marker,receiptText);await atomicWrite(archive,archiveText+receiptText);await unlink(pending);
  console.log(`PUBLISHED https://t.me/pizdato_net/${receipt.message_id}`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))run().catch(e=>{console.error(`ERROR: ${e.message}`);process.exitCode=1;});
