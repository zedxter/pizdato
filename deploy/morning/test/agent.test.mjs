import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWisdom,renderWisdom} from '../agent.mjs';
const clean='Будильник не делает утро добрым, он просто первым берёт на себя вину';
test('renders only attribution and quoted 10–15-word wisdom',()=>{
 assert.equal(renderWisdom(validateWisdom(clean)), `☕ Мудрость дня от дяди Миши:\n«${clean}»`);
});
test('rejects links, statistics, voting CTA and first-person copy',()=>{
 for(const bad of [clean+' https://pizdato.net',clean+' pizdato.net',clean+' Проголосуй!',clean+' 42', 'Я думаю, будильник не делает утро добрым и первым берёт на себя вину']) assert.throws(()=>validateWisdom(bad));
});
test('rejects missing wisdom, wrong word range and additional sections',()=>{
 for(const bad of ['',null,'Кофе решает всё',clean+'\n\nДоброе утро!',clean+'; '+clean]) assert.throws(()=>validateWisdom(bad));
});
test('rejects recently published wisdom regardless of punctuation or case',()=>assert.throws(()=>validateWisdom(clean,[clean.toUpperCase()+'.'])));
test('adds a short witty wish and rejects promotional or first-person wishes',async()=>{
 const {validateWish}=await import('../agent.mjs');
 const wish='Пусть сегодня сбудутся планы, а уведомления хотя бы постесняются.';
 assert.equal(renderWisdom(clean,validateWish(wish)),`☕ Мудрость дня от дяди Миши:\n«${clean}»\n\n✨ ${wish}`);
 for(const bad of [wish+' https://pizdato.net', 'Я желаю всем подписаться и проголосовать на нашем сайте', wish+'\nПодписывайтесь!', 'Доброе утро', Array(26).fill('планы').join(' ')]) assert.throws(()=>validateWish(bad));
});
test('keeps generated fields emoji-free so only host decoration appears',async()=>{
 const {validateWish}=await import('../agent.mjs');
 assert.throws(()=>validateWisdom(clean+' ☕'));
 assert.throws(()=>validateWish('Пусть сегодня сбудутся планы, а уведомления хотя бы постесняются. ✨'));
});
test('rejects first-person wish verbs even without a pronoun',async()=>{
 const {validateWish}=await import('../agent.mjs');
 assert.throws(()=>validateWish('Желаю, чтобы будильник проиграл без боя, а кофе дождался тебя горячим.'));
});

test('places the final full stop outside Russian quotation marks', () => {
  const message = renderWisdom('Готовая мысль.', 'Хорошего дня.');
  assert.ok(message.includes('«Готовая мысль».'));
  assert.ok(!message.includes('мысль.»'));
});
test('a broken profile fails the morning run and its check before any request',async()=>{
 const {mkdtemp,cp,readFile,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join,resolve}=await import('node:path');const {spawnSync}=await import('node:child_process');
 const root=await mkdtemp(join(tmpdir(),'morning-profile-'));
 try{
  for(const dir of ['morning','evening','editorial'])await cp(resolve(`deploy/${dir}`),join(root,dir),{recursive:true,filter:path=>!path.includes(`${dir}/test`)});
  const profile=join(root,'editorial/profiles/pizdato-channel.mjs');
  await writeFile(profile,(await readFile(profile,'utf8')).replace('  writerScope:','  writerScopeRenamed:'));
  // Every request is recorded and refused: the run must stop before the first one.
  await writeFile(join(root,'no-network.mjs'),"import {appendFileSync} from 'node:fs';globalThis.fetch=async url=>{appendFileSync(process.env.TEST_TRACE,String(url)+'\\n');throw new Error('network');};\n");
  for(const mode of ['--dry-run','--check','publish']){
   await writeFile(join(root,'trace'),'');
   const r=spawnSync(process.execPath,['--import',join(root,'no-network.mjs'),join(root,'morning/agent.mjs'),mode],{encoding:'utf8',env:{...process.env,OPENROUTER_API_KEY:'test',COMPOSIO_CONSUMER_KEY:'test',PIZDATO_CHANNEL_ENV:join(root,'missing'),PIZDATO_EVENING_ENV:join(root,'missing'),PIZDATO_MORNING_VAULT:join(root,'vault'),PIZDATO_MORNING_STATE:join(root,'state'),TEST_TRACE:join(root,'trace')}});
   assert.equal(r.status,1,mode);assert.match(r.stderr,/EDITORIAL_CONFIG.*writerScope/,mode);assert.doesNotMatch(r.stdout,/PREFLIGHT_OK|DRY_RUN_OK/,mode);
   assert.equal(await readFile(join(root,'trace'),'utf8'),'',`${mode} sent a request`);
  }
 }finally{await rm(root,{recursive:true,force:true});}
});
