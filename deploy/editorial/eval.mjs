// Non-publishing behavioral evaluation: no Composio connection or send path.
import {readFile,writeFile} from 'node:fs/promises';
import {loadEnv,chat} from '../evening/agent.mjs';
import {createGate,editorOptions} from './gate.mjs';
import {homedir} from 'node:os';
import {join} from 'node:path';
await loadEnv(join(homedir(),'.config/pizdato-channel.env'));
await loadEnv(join(homedir(),'.config/pizdato-evening.env'));
const fixtures=JSON.parse(await readFile(new URL('./fixtures.json',import.meta.url),'utf8')).filter(f=>!process.argv[3]||f.id===process.argv[3]);
if(!fixtures.length) throw new Error('Unknown fixture');
const results=[];
for(const fixture of fixtures) await Promise.all([1,2,3].map(async trial=>{
 const gate=createGate({request:messages=>chat(messages,undefined,editorOptions),history:fixture.history||[]});
 const verdict=await gate.review({text:fixture.text,wisdom:fixture.wisdom||fixture.text,source:fixture.source||null});
 const pass=verdict.decision===fixture.expected && (!fixture.dimension || verdict[fixture.dimension]===false);
 results.push({id:fixture.id,trial,pass,verdict});
 console.log(`${pass?'PASS':'FAIL'} ${fixture.id} trial=${trial}`);
}));
await writeFile(process.argv[2]||'/tmp/pizdato-editorial-eval.json',JSON.stringify({model:process.env.PIZDATO_EVENING_MODEL||'deepseek/deepseek-v4.1-flash',temperature:0,reasoning:editorOptions.reasoning,response_format:editorOptions.responseFormat,at:new Date().toISOString(),results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
