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
 prepare:async({edition})=>({hook:'Будильник зазвонил на час раньше.',body:['Дядя Миша проверил стрелки.','Производитель признал брак.'],pizdato:'никто не проспал.',huevo:`проснулись в ${edition.revision+5} утра.`,wisdom,source_url:'https://source.test/story',image_url:'https://source.test/image.jpg',supporting_urls:[]}),
 verify:async()=>({sources:{primary:{url:'https://source.test/story',text:'Evidence'},supporting:[]},media:{hash:'fixture'}}),
 review:async(messages,options)=>{if(options.title==='pizdato-verifier')return {content:JSON.stringify({verdicts:JSON.parse(messages[1].content).claims.map(c=>({id:c.id,real:true,category:c.category,ground:'confirmed',reason:'confirmed'}))})};if(options.title==='pizdato-proofreader')return {content:JSON.stringify({issues:[]})};const pass=JSON.parse(messages[1].content).current.revision>=3;return {content:JSON.stringify({issues:pass?[]:[{category:'grammar',quote:'проснулись',problem:'Repair agreement',fix:'Fix it'}]})};},
 send:async()=>{await appendFile(join(root,'sends'),'send\n');return {message_id:91,chat:{id:-1004350521393}};}
}});
console.log(result.phase);
