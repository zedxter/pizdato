// Real process-restart fixture: external services are deterministic, journals are real.
import {join} from 'node:path';
import {appendFile} from 'node:fs/promises';
import {EditionStore} from '../../evening/store.mjs';
import {tick} from '../../evening/worker.mjs';
const [root,attempt]=process.argv.slice(2),store=new EditionStore(join(root,'state'));
await store.initialize('2026-10-09');
const wisdom='Если долго искать потерянный носок, можно случайно найти смысл жизни под диваном';
const result=await tick({store,vault:join(root,'vault'),now:new Date(Date.parse('2026-10-09T16:00Z')+Number(attempt)*300000),deps:{
 history:async()=>[],
 prepare:async()=>({caption:`Дядя Миша заметил: пиздато, но хуёво. Мудрость дня: «${wisdom}».\nМир ждёт твоего голоса: https://pizdato.net`,wisdom,source_url:'https://source.test/story',image_url:'https://source.test/image.jpg',category:'Open microphone'}),
 verify:async()=>({sources:{primary:{url:'https://source.test/story',text:'Evidence'},supporting:[]},media:{hash:'fixture'}}),
 review:async messages=>{const pass=JSON.parse(messages[1].content).current.revision>=12;return {content:JSON.stringify({decision:pass?'approve':'revise',grammar:pass,meaning:true,freshness:true,voice:true,grounding:true,issues:pass?[]:['Repair agreement']})};},
 send:async()=>{await appendFile(join(root,'sends'),'send\n');return {message_id:91,chat:{id:-1004350521393}};}
}});
console.log(result.phase);
