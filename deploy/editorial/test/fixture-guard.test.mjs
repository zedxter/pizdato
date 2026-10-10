import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {contamination,RUBRICS} from '../fixture-guard.mjs';

const fixture={id:'demo',text:'Кот уронил вазу с подоконника прямо на соседа снизу.',expectedQuote:'на соседа'};
test('a rubric that copies a fixture sentence or its injected defect is reported',()=>{
 assert.deepEqual(contamination([fixture],{'clean.md':'Report a wrong preposition («в течении»).'}),[]);
 assert.deepEqual(contamination([fixture],{'copied.md':'Example: «уронил вазу с подоконника».'}).map(f=>[f.fixture,f.rubric]),[['demo','copied.md']]);
 assert.deepEqual(contamination([fixture],{'defect.md':'Example: «упал на соседа».'}).map(f=>[f.fixture,f.rubric]),[['demo','defect.md']]);
});
test('host-printed lines shared by every post are not contamination',()=>{
 const post={id:'post',text:'Текст.\n\nМир ждёт твоего голоса: https://pizdato.net'};
 assert.deepEqual(contamination([post],{'prompt.md':'End with «Мир ждёт твоего голоса: https://pizdato.net».'}),[]);
});
test('no fixture text or injected defect reaches a rubric or prompt shown to a model',async()=>{
 const fixtures=JSON.parse(await readFile(new URL('../fixtures.json',import.meta.url),'utf8'));
 const rubrics=Object.fromEntries(await Promise.all(RUBRICS.map(async path=>[path,await readFile(new URL(`../../${path}`,import.meta.url),'utf8')])));
 assert.deepEqual(contamination(fixtures,rubrics),[]);
});
