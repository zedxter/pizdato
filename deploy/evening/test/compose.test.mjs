import test from 'node:test';
import assert from 'node:assert/strict';
import {CTA,render,normalize,words,check,chooseWisdom,locate,sectionsFor,merge,category} from '../compose.mjs';
const wisdom='Чем меньше притяжение, тем дольше грунт делает вид, что он на месте';
const draft={hook:'Кратер Стикни занимает почти половину Фобоса.',body:['Дядя Миша прикинул: удар едва не расколол луну пополам.','Откуда борозды, в NASA пока не знают.'],pizdato:'снимок показал свежий грунт у кромки.',huevo:'причину борозд до сих пор не назвали.',wisdom,source_url:'https://example.com/story',image_url:'https://example.com/cover.jpg',supporting_urls:[]};
test('host renders the fixed evening layout with exact quotation and CTA',()=>{
 assert.equal(render(draft),`Кратер Стикни занимает почти половину Фобоса.\n\nДядя Миша прикинул: удар едва не расколол луну пополам.\n\nОткуда борозды, в NASA пока не знают.\n\nПиздато: снимок показал свежий грунт у кромки.\nХуёво: причину борозд до сих пор не назвали.\n\nМудрость дня: «${wisdom}».\n\n${CTA}`);
 assert.match(render({...draft,wisdom:'Зачем лететь к Марсу, если можно смотреть на него из-под одеяла?'}),/«Зачем лететь к Марсу, если можно смотреть на него из-под одеяла\?»\n/);
});
test('writer labels, quotes, duplicated CTA and stray whitespace are normalized before review',()=>{
 const d=normalize({...draft,hook:'  Кратер   Стикни\nзанимает почти половину Фобоса. ',pizdato:'Пиздато: снимок показал свежий грунт у кромки.',huevo:'Хуёво — причину борозд до сих пор не назвали.',wisdom:`Мудрость дня: «${wisdom}».`,body:[...draft.body,`  ${CTA}  `,'']});
 assert.deepEqual({hook:d.hook,body:d.body,pizdato:d.pizdato,huevo:d.huevo,wisdom:d.wisdom},{hook:draft.hook,body:draft.body,pizdato:draft.pizdato,huevo:draft.huevo,wisdom});
});
test('word counting ignores dashes and punctuation',()=>{
 assert.equal(words('Хочешь увидеть далёкое — используй ближнее как линзу, а не как стену.').length,11);
 assert.equal(words('Пол-луны — это всё-таки много').length,4);
});
test('a valid draft has no mechanical findings',()=>assert.deepEqual(check(draft),[]));
test('length findings give exact measured numbers and unlock only the story text',()=>{
 const long={...draft,body:[draft.body[0],'Очень длинный абзац. '.repeat(45)]};
 const [issue]=check(long);
 assert.equal(issue.section,'body');
 assert.match(issue.problem,new RegExp(`${[...render(long)].length} characters`));
 assert.match(issue.fix,/at least \d+ characters/);
});
test('wisdom word count is measured by the host and reported for the wisdom only',()=>{
 const [issue]=check({...draft,wisdom:'Ближнее работает линзой'});
 assert.equal(issue.section,'wisdom');assert.match(issue.problem,/3 words/);
});
test('Uncle Misha may appear in any grammatical case but must appear',()=>{
 for(const form of ['дяди Миши','дяде Мише','дядю Мишу','дядей Мишей','Дядя Миша']) assert.deepEqual(check({...draft,body:[`По мнению ${form}, это смешно.`,draft.body[1]]}),[],form);
 assert.equal(check({...draft,body:['Удар едва не расколол луну.',draft.body[1]]})[0].section,'body');
});
test('first-person narration, links and missing sections are mechanical findings',()=>{
 assert.ok(check({...draft,hook:'Я нашёл кратер на Фобосе.'}).some(i=>i.category==='ai-slop'));
 assert.ok(check({...draft,body:[draft.body[0],'Подробности: https://example.com/story']}).some(i=>/link/i.test(i.problem)));
 assert.ok(check({...draft,huevo:''}).some(i=>i.section==='huevo'));
 assert.ok(check({...draft,body:[]}).some(i=>i.section==='body'));
});
test('recently published or already flagged wisdom is never reused',()=>{
 assert.ok(check(draft,{flagged:[wisdom.toUpperCase()+'!']}).some(i=>i.section==='wisdom'));
 assert.ok(check(draft,{history:[{text:`Мудрость дня: «${wisdom}».`}]}).some(i=>i.section==='wisdom'&&i.category==='repetition'));
});
test('host picks the first brainstormed wisdom that meets the word count and was not flagged',()=>{
 const options=['Совсем коротко','Чем меньше притяжение, тем дольше грунт делает вид, что он на месте','Луна может быть почти невесомой, но грунт на ней всё равно не стоит на месте'];
 assert.equal(chooseWisdom({...draft,wisdom:'Коротко и мимо',wisdom_options:options}),options[1]);
 assert.equal(chooseWisdom({...draft,wisdom:'Коротко и мимо',wisdom_options:options},{flagged:[options[1]]}),options[2]);
 assert.equal(chooseWisdom(draft),wisdom);
});
test('findings unlock only the sections containing their quotes',()=>{
 assert.deepEqual(sectionsFor(draft,[{category:'grammar',quote:'«удар едва не расколол луну пополам»'}]),['body']);
 assert.deepEqual(sectionsFor(draft,[{category:'grammar',quote:'Хуёво: причину борозд до сих пор не назвали.'}]),['huevo']);
 assert.deepEqual(sectionsFor(draft,[{category:'wisdom',quote:`Мудрость дня: «${wisdom}»`},{category:'format',section:'hook',quote:''}]).sort(),['hook','wisdom']);
 assert.deepEqual(sectionsFor(draft,[{category:'meaning',quote:'текст, которого нет'}]).sort(),['body','hook','huevo','pizdato','wisdom']);
});
test('repair merge keeps locked sections byte-identical',()=>{
 const next={...draft,hook:'Переписанный заголовок.',huevo:'исправленная мысль.',wisdom:'Новая мудрость'};
 const merged=merge(draft,next,['huevo']);
 assert.equal(merged.hook,draft.hook);assert.equal(merged.wisdom,draft.wisdom);assert.equal(merged.huevo,'исправленная мысль.');
});
test('weekday category is derived by the host from the edition date',()=>{
 assert.equal(category('2026-10-09'),'Пятница — свободный микрофон');
 assert.equal(category('2026-10-12'),'Понедельник — ИИ недели');
});
test('host detects blockers the writer left in place and verbatim echoes before another review',()=>{
 const blocker={category:'spelling',quote:'расколол луну пополам',problem:'Typo',fix:'x',by:'proofreader'};
 const [left]=check(draft,{unresolved:[blocker]});
 assert.equal(left.section,'body');assert.match(left.problem,/still present/i);assert.equal(left.category,'spelling');
 assert.deepEqual(check(draft,{unresolved:[{...blocker,quote:'фрагмент, которого больше нет'}]}),[]);
 assert.ok(check(draft,{unresolved:[{...blocker,quote:''}],previous:render(draft)}).some(i=>/unchanged/i.test(i.problem)));
 assert.deepEqual(check(draft,{unresolved:[{...blocker,quote:'луну'}]}),[],'a very short quote is too ambiguous to judge');
 assert.ok(check({...draft,body:['Дядя Миша видит дыру в поллуны.',draft.body[1]]},{unresolved:[{...blocker,quote:'поллуны'}]}).some(i=>/still present/i.test(i.problem)),'a distinctive misspelled word is checked');
});
test('stock phrases found across the archive are caught with their exact span',()=>{
 const cases={hook:['Дядя Миша листал ленту за кофе — а там кратер.','Дядя Миша прибалдел: кратер огромный.','Новость, от которой хочется протереть глаза.','Пятница, свободный микрофон: кратер на Фобосе.','Кратер на Фобосе — а там дыра.'],
  body:['Честная оговорка: снимок старый.','И вот соль: никто не знает.','Дальше веселее.','Это не просто кратер, а настоящая дыра.','NASA честно пишет, что не знает.'],
  huevo:['чтобы найти кота, пришлось вскрывать стену.'],wisdom:['Бросай бутылку смело — Вселенная отвечает, просто не сразу']};
 for(const [section,texts] of Object.entries(cases))for(const text of texts){
  const d={...draft,[section]:section==='body'?[draft.body[0],text]:text};
  const hit=check(d).find(i=>i.category==='ai-slop'&&i.section===section);
  assert.ok(hit,`${section}: ${text}`);assert.ok(text.toLowerCase().includes(hit.quote.toLowerCase()),hit.quote);
 }
});
test('known recurring language errors are blockers before any model review',()=>{
 for(const [text,category] of [['Дыра в поллуны.','spelling'],['Старый-добрый способ.','spelling'],['Сила тяжести меньше земной больше чем в тысячу раз.','wrong-phrase'],['Сохраняют дзен, чтобы вокруг ни происходило.','spelling']])
  assert.ok(check({...draft,body:[draft.body[0],text]}).some(i=>i.category===category),text);
});
test('ordinary words near stock phrases do not trigger the lint',()=>{
 for(const text of ['В кафе подают кофе за пять евро.','Судья нашёл ошибку в протоколе.','Он не просто ушёл.','Чтобы найти кота, хозяйка вскрыла стену.','Илья нашёл кратер.'])
  assert.deepEqual(check({...draft,body:[draft.body[0],text]}).filter(i=>i.category!=='format'),[],text);
});
test('persona once or twice is fine; a sticker on every line and emoji sprinkles are findings',()=>{
 const plain=[ 'Удар едва не расколол луну пополам.',draft.body[1]];
 assert.ok(check({...draft,body:plain,hook:'Дядя Миша считает кратеры.',pizdato:'дядя Миша доволен.'}).every(i=>i.category!=='ai-slop'));
 assert.ok(check({...draft,body:plain,hook:'Дядя Миша считает кратеры.',pizdato:'дядя Миша доволен.',huevo:'дяде Мише грустно.'}).some(i=>/three times/.test(i.problem)));
 assert.ok(check({...draft,body:[draft.body[0],'Кратер огромный 🤖🙈']}).some(i=>/emoji/i.test(i.problem)));
});
test('a mostly bad story may print its Хуёво verdict first',()=>{
 assert.match(render({...draft,huevo_first:true}),/\n\nХуёво: причину борозд до сих пор не назвали\.\nПиздато: снимок показал свежий грунт у кромки\.\n\n/);
});
test('the wisdom may be a short punchline of six words or more',()=>{
 assert.deepEqual(check({...draft,wisdom:'Не обязательно уметь летать, чтобы сбить с ног'}),[]);
 assert.match(check({...draft,wisdom:'Бот обидится'})[0].problem,/6–15/);
});
test('verdict or wisdom lines pasted into the story are dropped so they are not printed twice',()=>{
 const d=normalize({...draft,body:[...draft.body,'Пиздато: снимок показал свежий грунт.','Хуёво — борозды.','Мудрость дня: «Что-то».']});
 assert.deepEqual(d.body,draft.body);
});
test('echo detection keeps punctuation, hyphens and ё so correct fixes are not bounced',()=>{
 const blocker=(quote,fix)=>({category:'punctuation',quote,problem:'p',fix});
 for(const [before,after] of [['сказал что','сказал, что'],['кто то','кто-то'],['старый-добрый','старый добрый'],['еще','ещё']]){
  const d={...draft,body:[`Дядя Миша ${after} всё понял.`,draft.body[1]]};
  assert.deepEqual(check(d,{unresolved:[blocker(before,after)]}).filter(i=>/still present/i.test(i.problem)),[],before);
 }
 assert.ok(check({...draft,body:['Дядя Миша сказал что всё понял.',draft.body[1]]},{unresolved:[blocker('сказал что всё понял','сказал, что')]}).some(i=>/still present/i.test(i.problem)));
});
test('quotes are located on word boundaries and a short pronoun does not unlock unrelated sections',()=>{
 assert.deepEqual(locate(draft,{quote:'Он'}),[]);
 assert.deepEqual(sectionsFor(draft,[{category:'grammar',quote:'Миша прикинул'}]),['body']);
});
test('first-person and stock checks skip quoted direct speech, links include t.me, short links and mentions',()=>{
 for(const q of ['«Я думаю, это был метеорит», — сказал фермер.','«Мне кажется, он упал ночью», — говорит его жена.','Учёный признался: «Кто бы мог подумать».'])
  assert.deepEqual(check({...draft,body:[draft.body[0],q]}).filter(i=>i.category==='ai-slop'),[],q);
 for(const link of ['Подробности в t.me/free_drop','Скидка по bit.ly/3abcDEF','Пишите @promo_channel','Сайт shop.xyz/sale'])
  assert.ok(check({...draft,body:[draft.body[0],link]}).some(i=>/link/i.test(i.problem)),link);
 assert.deepEqual(check({...draft,body:[draft.body[0],'Отель нашли через Booking.com за полцены.']}).filter(i=>/link/i.test(i.problem)),[]);
});
test('an overlong caption unlocks hook and story and states the exact excess',()=>{
 const long={...draft,hook:'Очень длинный заголовок. '.repeat(8),body:[draft.body[0],'Очень длинный абзац. '.repeat(30)]};
 const issue=check(long).find(i=>/characters/.test(i.problem));const chars=[...render(long)].length;
 assert.deepEqual(sectionsFor(long,[issue]),['hook','body']);assert.match(issue.fix,new RegExp(`at least ${chars-950} characters`));
});
test('wisdom normalization keeps ellipses and inner quotation marks',()=>{
 assert.equal(render({...draft,wisdom:'Ну и ну...'}).includes('Мудрость дня: «Ну и ну...»'),true);
 assert.equal(normalize({...draft,wisdom:'Кто сказал «нет», тот и чинит'}).wisdom,'Кто сказал «нет», тот и чинит');
 assert.equal(normalize({...draft,wisdom:'«Все цитаты в кавычках».'}).wisdom,'Все цитаты в кавычках');
 assert.equal(normalize({...draft,wisdom:'Ну и ну...'}).wisdom,'Ну и ну...');assert.equal(normalize({...draft,wisdom:'«Потом» — подумал он'}).wisdom,'«Потом» — подумал он');
 assert.match(render(normalize({...draft,wisdom:'Кто будет чинить?..'})),/«Кто будет чинить\?\.\.»\n/);
});
test('supporting URLs must be absolute HTTPS and at most ten',()=>{
 assert.ok(check({...draft,supporting_urls:['http://insecure.test/a']}).some(i=>/supporting/i.test(i.problem)));
 assert.ok(check({...draft,supporting_urls:Array.from({length:11},(_,i)=>`https://e.test/${i}`)}).some(i=>/supporting/i.test(i.problem)));
});
test('a repair keeps the writer\'s current source-owned cover',()=>{
 assert.equal(merge(draft,{...draft,image_url:'https://example.com/new-cover.jpg'},['huevo']).image_url,'https://example.com/new-cover.jpg');
});
