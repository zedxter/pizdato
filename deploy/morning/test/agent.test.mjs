import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWisdom,renderWisdom} from '../agent.mjs';
const clean='Будильник не делает утро добрым, он просто первым берёт на себя вину';
test('renders only attribution and quoted 10–15-word wisdom',()=>{
 assert.equal(renderWisdom(validateWisdom(clean)), `Мудрость дня от дяди Миши:\n«${clean}»`);
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
 assert.equal(renderWisdom(clean,validateWish(wish)),`Мудрость дня от дяди Миши:\n«${clean}»\n\n${wish}`);
 for(const bad of [wish+' https://pizdato.net', 'Я желаю всем подписаться и проголосовать на нашем сайте', wish+'\nПодписывайтесь!', 'Доброе утро', Array(26).fill('планы').join(' ')]) assert.throws(()=>validateWish(bad));
});
