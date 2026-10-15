import test from 'node:test';
import assert from 'node:assert/strict';
import {loadMaterial,preferredFormat} from '../material.mjs';
const xml='<rss><channel><item><link>https://www.anekdot.ru/id/123/</link><description><![CDATA[An ordinary joke with a complete setup and punchline, long enough to judge on its merits without inventing any missing details.]]></description></item></channel></rss>';
test('supplies fetched jokes as attributed fiction, not reported facts',async()=>{
 const material=await loadMaterial([],async(url)=>url.includes('anekdot.ru')?new Response(xml):new Response('blocked',{status:403}));
 assert.equal(material.sources.length,1);assert.equal(material.sources[0].kind,'anecdote');
 assert.match(material.sources[0].primary.text,/setup and punchline/);
 assert.equal(material.sources[0].primary.url,'https://www.anekdot.ru/id/123/');
});
test('skips recent sources, foreign links, HTML error pages and unavailable feeds',async()=>{
 assert.equal((await loadMaterial([{text:'Источник: https://www.anekdot.ru/id/123/'}],async()=>new Response(xml))).sources.length,0);
 for(const body of ['<html>Access denied</html>',xml.replace('https://www.anekdot.ru/id/123/','https://localhost/secret')])assert.equal((await loadMaterial([],async()=>new Response(body))).sources.length,0);
 assert.equal((await loadMaterial([],async()=>{throw new Error('unavailable');})).sources.length,0);
});
test('varies the preferred format across three consecutive days',()=>{
 assert.equal(new Set(['2026-10-15','2026-10-16','2026-10-17'].map(preferredFormat)).size,3);
});
