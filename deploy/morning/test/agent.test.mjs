import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMorningPost} from '../agent.mjs';
const clean='📱 Решил посмотреть только время.\n\nПрочитал новости, прогноз погоды и спор о том, как правильно варить яйца. Теперь могу вести утренний эфир.\n\nКоторый час — пока не знаю.';
test('preserves a complete first-person miniature with contextual emoji',()=>{
 assert.deepEqual(validateMorningPost({text:clean,sourceId:null}),{text:clean,source:null});
});
test('rejects old wisdom/wish objects, missing decoration, emoji spam and promotion',()=>{
 for(const candidate of [{wisdom:'thought',wish:'wish'},{text:clean.replace('📱',''),sourceId:null},{text:clean+' 😂😂😂',sourceId:null},{text:clean+' https://pizdato.net',sourceId:null},{text:clean+' Подписывайтесь на канал!',sourceId:null},{text:'🙂 short',sourceId:null}])assert.throws(()=>validateMorningPost(candidate));
});
test('binds attribution and evidence to a fetched source, never a model-provided URL',()=>{
 const sources=[{id:'joke-1',kind:'anecdote',primary:{url:'https://www.anekdot.ru/id/123/',text:'Source joke',fetchedAt:'2026-10-15T08:00:00Z'},supporting:[]}];
 const result=validateMorningPost({text:clean,sourceId:'joke-1'},sources);
 assert.equal(result.source,sources[0]);assert.ok(result.text.endsWith('Источник: https://www.anekdot.ru/id/123/'));
 assert.throws(()=>validateMorningPost({text:clean,sourceId:'invented'},sources));
});
test('a broken profile fails the morning run and its check before any request',async()=>{
 const {mkdtemp,cp,readFile,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join,resolve}=await import('node:path');const {spawnSync}=await import('node:child_process');
 const root=await mkdtemp(join(tmpdir(),'morning-profile-'));
 try{
  for(const dir of ['morning','evening','editorial'])await cp(resolve(`deploy/${dir}`),join(root,dir),{recursive:true,filter:path=>!path.includes(`${dir}/test`)});
  const profile=join(root,'editorial/profiles/pizdato-channel.mjs'),good=await readFile(profile,'utf8');
  // Every request is recorded and refused: the run must stop before the first one.
  await writeFile(join(root,'no-network.mjs'),"import {appendFileSync} from 'node:fs';globalThis.fetch=async url=>{appendFileSync(process.env.TEST_TRACE,String(url)+'\\n');throw new Error('network');};\n");
  // A lost slot and a profile of the wrong shape (which must not crash at import) both fail as configuration errors.
  for(const [from,to,named] of [['  writerScope:','  writerScopeRenamed:',/EDITORIAL_CONFIG.*writerScope/],["suggestions:Object.freeze(['wisdom'])",'suggestions:null',/EDITORIAL_CONFIG.*suggestion/]])for(const mode of ['--dry-run','--check','publish']){
   assert.ok(good.includes(from));await writeFile(profile,good.replace(from,to));
   await writeFile(join(root,'trace'),'');
   const r=spawnSync(process.execPath,['--import',join(root,'no-network.mjs'),join(root,'morning/agent.mjs'),mode],{encoding:'utf8',env:{...process.env,NOUS_API_KEY:'test',COMPOSIO_CONSUMER_KEY:'test',PIZDATO_CHANNEL_ENV:join(root,'missing'),PIZDATO_EVENING_ENV:join(root,'missing'),PIZDATO_MORNING_VAULT:join(root,'vault'),PIZDATO_MORNING_STATE:join(root,'state'),TEST_TRACE:join(root,'trace')}});
   assert.equal(r.status,1,mode);assert.match(r.stderr,named,mode);assert.doesNotMatch(r.stdout,/PREFLIGHT_OK|DRY_RUN_OK/,mode);
   assert.equal(await readFile(join(root,'trace'),'utf8'),'',`${mode} sent a request`);
  }
 }finally{await rm(root,{recursive:true,force:true});}
});
test('repair cannot drop or swap the source that grounds the current story',()=>{
 const source={id:'joke-1',kind:'anecdote',primary:{url:'https://www.anekdot.ru/id/123/',text:'Fetched joke'},supporting:[]};
 assert.throws(()=>validateMorningPost({text:clean,sourceId:null},[source],'joke-1'));
 assert.throws(()=>validateMorningPost({text:clean,sourceId:'joke-1'},[source],null));
 assert.equal(validateMorningPost({text:clean,sourceId:'joke-1'},[source],'joke-1').source,source);
});
