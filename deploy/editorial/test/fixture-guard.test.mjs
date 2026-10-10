import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {contamination,overlap,RUBRICS} from '../fixture-guard.mjs';
import {existsSync} from 'node:fs';

const fixture={id:'demo',text:'Кот уронил вазу с подоконника прямо на соседа снизу.',expectedQuote:'на соседа'};
test('a rubric that copies a fixture sentence or its injected defect is reported',()=>{
 assert.deepEqual(contamination([fixture],{'clean.md':'Report a wrong preposition («в течении»).'}),[]);
 assert.deepEqual(contamination([fixture],{'copied.md':'Example: «уронил вазу с подоконника».'}).map(f=>[f.fixture,f.rubric]),[['demo','copied.md']]);
 assert.deepEqual(contamination([fixture],{'defect.md':'Example: «упал на соседа».'}).map(f=>[f.fixture,f.rubric]),[['demo','defect.md']]);
});
test('host-printed strings are not contamination, but text after a label is',()=>{
 const post={id:'post',text:'Текст.\n\nХуёво: кот не умеет читать мысли хозяина\n\nМир ждёт твоего голоса: https://pizdato.net'};
 assert.deepEqual(contamination([post],{'prompt.md':'Lines «Хуёво: …» and «Мир ждёт твоего голоса: https://pizdato.net».'}),[]);
 assert.equal(contamination([post],{'copied.md':'Example: «Хуёво: кот не умеет читать мысли».'}).length,1);
});
test('an injected span copied into a rubric is reported even when it is short',()=>{
 assert.equal(contamination([{id:'s',text:'Он одел шапку.',injected:'одел шапку'}],{'r.md':'Flag «одел шапку».'}).length,1);
 assert.equal(contamination([{id:'s',text:'Он одел шапку.',injected:'одел шапку'}],{'r.md':'Flag «надел шапку».'}).length,0);
});
test('a held-out set shares no article and no long passage with the other fixtures',()=>{
 const dev=[{id:'d',text:'Один два три четыре пять шесть семь восемь.',source:{primary:{url:'https://a.test/x'}}}];
 assert.deepEqual(overlap([{id:'h',text:'Совсем другой текст про другое событие недели.',source:{primary:{url:'https://b.test/y'}}}],dev),[]);
 assert.equal(overlap([{id:'h',text:'Другое.',source:{primary:{url:'https://a.test/x'}}}],dev).length,1);
 assert.equal(overlap([{id:'h',text:'Вот: два три четыре пять шесть семь.',source:{primary:{url:'https://b.test/y'}}}],dev).length,1);
});
test('no fixture text or injected defect reaches a rubric or prompt shown to a model',async()=>{
 const fixtures=JSON.parse(await readFile(new URL('../fixtures.json',import.meta.url),'utf8'));
 const rubrics=Object.fromEntries(await Promise.all(RUBRICS.map(async path=>[path,await readFile(new URL(`../../${path}`,import.meta.url),'utf8')])));
 assert.deepEqual(contamination(fixtures,rubrics),[]);
});
test('the revealed held-out set is independent of the dev and #219 fixtures',async t=>{
 const sealed=new URL('../fixtures-heldout-222.json',import.meta.url);
 if(!existsSync(sealed))return t.skip('sealed until the final run');
 const others=JSON.parse(await readFile(new URL('../fixtures.json',import.meta.url),'utf8')),heldout=JSON.parse(await readFile(sealed,'utf8'));
 assert.deepEqual(overlap(heldout,others),[]);
 const rubrics=Object.fromEntries(await Promise.all(RUBRICS.map(async path=>[path,await readFile(new URL(`../../${path}`,import.meta.url),'utf8')])));
 assert.deepEqual(contamination(heldout,rubrics),[]);
});
