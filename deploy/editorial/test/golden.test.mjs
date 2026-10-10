// Channel equivalence (editorial-profiles, design 7): the profile gate must send and decide exactly what da0b2ed did.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {BASELINE,CASES,runCase,runPreflight} from './golden-cases.mjs';
import {provenance} from './capture-goldens.mjs';
import {createGate} from '../gate.mjs';
import {composeRubric} from '../compose-rubric.mjs';
import channel from '../profiles/pizdato-channel.mjs';
import {createServices,Budget} from '../../evening/network.mjs';
import {EditionStore} from '../../evening/store.mjs';
// sha256 of the da0b2ed rubric files, pinned independently of the goldens file.
const PINNED={'editor.md':'fe6646a1fa92e6ca6cc3c8e55799ddcc8329c6787ec5a48c985496cf0296f138','proofreader.md':'cc6f6941c84ced3e157d615a230f765a7e4a138799b7536e81c845b1c3fae792','verifier.md':'4b98937112ec70060b8d62e66bc5b9b0dd16d356a9a8ffa56724b17e8ca7d8e9','writer.md':'1e05eb72b8f45fa4654227ab9c70a9f011d17c0720a6b8e8f518cd54b938adac'};
const sha=text=>createHash('sha256').update(text).digest('hex');
const goldens=JSON.parse(await readFile(new URL('./goldens/channel.json',import.meta.url),'utf8'));
const channelGate={createGate:o=>createGate({...o,profile:channel}),review:(gate,{wisdom,...step})=>gate.review({...step,fields:{wisdom}})};
test('goldens come from the baseline release and pin its four rubrics',()=>{
 assert.equal(goldens.baseline,BASELINE);assert.deepEqual(goldens.rubricSha256,PINNED);
 assert.equal(goldens.cases.length+1,10,'nine gate cases plus the preflight');
 assert.equal(JSON.stringify(goldens.cases.map(({name,input,answers})=>({name,input,answers}))),JSON.stringify(CASES),'the shared case definitions still match what was captured');
});
test('the channel profile composes every rubric byte-identical to da0b2ed',()=>{
 for(const name of ['editor','proofreader','verifier','writer'])assert.equal(sha(composeRubric(name,channel)),PINNED[`${name}.md`],name);
});
for(const golden of goldens.cases) test(`golden: ${golden.name}`,async()=>{
 const actual=await runCase(golden,channelGate);
 assert.deepEqual(actual.requests.map(r=>r.key),golden.requests.map(r=>r.key));
 actual.requests.forEach((r,i)=>{assert.equal(r.messages,golden.requests[i].messages,`${r.key} messages`);assert.equal(r.options,golden.requests[i].options,`${r.key} options`);});
 assert.equal(actual.results.length,golden.results.length);actual.results.forEach((r,i)=>assert.equal(r,golden.results[i],`result ${i}`));
 assert.equal(actual.records.length,golden.records.length);actual.records.forEach((r,i)=>assert.equal(r,golden.records[i],`record ${i}`));
 assert.equal(actual.snapshot,golden.snapshot);
});
test('golden: network.check preflight requests',async()=>{
 const actual=await runPreflight({createServices,Budget,EditionStore});
 assert.equal(actual.error,goldens.preflight.error);assert.equal(actual.requests.length,goldens.preflight.requests.length);
 actual.requests.forEach((r,i)=>{const g=goldens.preflight.requests[i];assert.equal(r.key,g.key);assert.equal(r.url,g.url);assert.equal(r.headers,g.headers,`${r.key} headers`);assert.equal(r.body,g.body,`${r.key} body`);});
});
test('capture refuses a wrong commit, a dirty baseline, a profile gate and foreign deploy changes',()=>{
 const ok={head:BASELINE,dirty:false,gateSource:'export function createGate({request,history}){}',gateExports:['createGate'],changed:['deploy/editorial/gate.mjs','deploy/evening/worker.mjs','deploy/morning/agent.mjs']};
 assert.doesNotThrow(()=>provenance(ok));
 assert.throws(()=>provenance({...ok,head:'a'.repeat(40)}),/expected da0b2ed/);
 assert.throws(()=>provenance({...ok,dirty:true}),/local changes/);
 assert.throws(()=>provenance({...ok,gateSource:'export function createGate({profile,request}){}'}),/accepts a profile/);
 assert.throws(()=>provenance({...ok,gateExports:['createGate','reviewOptions']}),/accepts a profile/);
 assert.throws(()=>provenance({...ok,changed:['deploy/evening/compose.mjs']}),/compose\.mjs/);
 // Channel delivery code and data next to the changed files are not this change's.
 for(const path of ['deploy/editorial/history.mjs','deploy/editorial/publication.mjs','deploy/editorial/install.py','deploy/editorial/fixtures.json','deploy/editorial/store.mjs','deploy/evening/store.mjs','deploy/editorial/test/history.test.mjs','deploy/evening/test/compose.test.mjs','deploy/morning/test/runner2.rs'])
  assert.throws(()=>provenance({...ok,changed:[path]}),new RegExp(path.replace(/[./]/g,'\\$&')),path);
});
test('capture accepts every deploy/ file this change touches since the baseline',t=>{
 const diff=spawnSync('git',['diff','--name-only',BASELINE,'HEAD','--','deploy/'],{encoding:'utf8'});
 if(diff.status!==0)return t.skip('baseline commit not in this clone');
 assert.doesNotThrow(()=>provenance({head:BASELINE,dirty:false,gateSource:'',gateExports:[],changed:diff.stdout.split('\n').filter(Boolean)}));
});
test('capture run against a worktree that is not the baseline writes nothing',async()=>{
 const root=await mkdtemp(join(tmpdir(),'golden-capture-'));
 try{
  const out=join(root,'channel.json'),r=spawnSync(process.execPath,['deploy/editorial/test/capture-goldens.mjs','--baseline','.','--out',out],{encoding:'utf8'});
  assert.notEqual(r.status,0);assert.match(r.stderr,/REFUSED/);assert.equal(existsSync(out),false);
 }finally{await rm(root,{recursive:true,force:true});}
});
const polish=composeRubric('writer',channel);
test('the evening network writer receives the da0b2ed polish',async()=>{
 const systems=[];
 const budget=new Budget({resolver:async()=>[{address:'8.8.8.8'}],fetcher:async(u,o)=>{
  if(u.includes('openrouter')){const r=JSON.parse(o.body);systems.push(r.messages[0].content);
   return new Response(JSON.stringify({choices:[{message:r.tools?{role:'assistant',tool_calls:[{id:'f',type:'function',function:{name:'fetch_url',arguments:'{"url":"https://example.com/story"}'}}]}:{content:JSON.stringify({source_url:'https://example.com/story'})}}]}));}
  return new Response('<meta property="og:image" content="https://example.com/cover.jpg">'+('evidence '.repeat(50)));
 }});
 const e={day:'2026-10-09',searches:[],visited:[],reserve:[],abandoned:[],findings:[]};
 await createServices({store:new EditionStore('/nonexistent/polish'),vault:'/nonexistent',budget,dryRun:true}).prepare({edition:e,history:[],checkpoint:async()=>{},now:new Date('2026-10-09')});
 assert.equal(sha(polish),PINNED['writer.md']);assert.equal(systems.length,2);
 for(const s of systems)assert.ok(s.includes(`\n${polish}\n`),'discovery and drafting prompts carry the exact polish');
});
for(const slot of ['morning','evening']) test(`the ${slot} agent writer receives the da0b2ed polish`,async()=>{
 const root=await mkdtemp(join(tmpdir(),'golden-polish-'));
 try{
  await mkdir(join(root,'vault/posts'),{recursive:true});await writeFile(join(root,'trace'),'');
  const prefix=`PIZDATO_${slot.toUpperCase()}`;
  const r=spawnSync(process.execPath,['--import',resolve('deploy/editorial/test/fake-network.mjs'),'--import',resolve('deploy/editorial/test/system-trace.mjs'),`deploy/${slot}/agent.mjs`,'--dry-run'],{encoding:'utf8',timeout:20000,env:{...process.env,OPENROUTER_API_KEY:'test',COMPOSIO_CONSUMER_KEY:'test',PIZDATO_CHANNEL_ENV:join(root,'missing'),PIZDATO_EVENING_ENV:join(root,'missing'),[`${prefix}_VAULT`]:join(root,'vault'),[`${prefix}_STATE`]:join(root,'state'),TEST_TRACE:join(root,'trace'),TEST_SYSTEM:join(root,'system'),TEST_VERDICT:'approve'}});
  assert.equal(r.status,0,r.stderr+r.stdout);
  const systems=(await readFile(join(root,'system'),'utf8')).trim().split('\n').map(l=>JSON.parse(l));
  assert.ok(systems.length>0);for(const s of systems)assert.ok(s.endsWith(`Post-polish resources:\n${polish}`)||s.includes(`\nPost-polish resources:\n${polish}`),s.slice(-200));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('no production code reads a rubric template or a stale rubric file directly',async()=>{
 const roots=['deploy/editorial','deploy/evening','deploy/morning'];
 for(const dir of roots)for(const name of (await readdir(dir)).filter(n=>n.endsWith('.mjs'))){
  const source=await readFile(join(dir,name),'utf8');
  if(name!=='compose-rubric.mjs')assert.doesNotMatch(source,/\.template\.md|(editor|proofreader|verifier|writer)\.md/,`${dir}/${name}`);
 }
 for(const f of ['editor.md','proofreader.md','verifier.md','writer.md'])assert.equal(existsSync(join('deploy/editorial',f)),false,`${f} was renamed to a template`);
});
