import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft, readOnlyCall, parseMcp } from '../agent.mjs';
const wisdom='Пиздато жить там где даже маленькие странности каждый день становятся большими историями';
const caption=`Дядя Миша увидел смешную историю.\n\nПиздато: улыбнулся. Хуёво: кофе остыл.\n\nМудрость дня: «${wisdom}».\n\nМир ждёт твоего голоса: https://pizdato.net`;
test('accepts polished copy with exact CTA and wisdom',()=>assert.doesNotThrow(()=>validateDraft({caption,wisdom,source_url:'https://example.com/story'})));
test('rejects oversized copy, missing CTA and short wisdom',()=>{
 assert.throws(()=>validateDraft({caption:'x'.repeat(951),wisdom,source_url:'https://example.com'}));
 assert.throws(()=>validateDraft({caption:caption.replace('Мир ждёт','Нас ждёт'),wisdom,source_url:'https://example.com'}));
 assert.throws(()=>validateDraft({caption,wisdom:'Всего два',source_url:'https://example.com'}));
});
test('agent cannot send through MCP even with mixed batch',()=>{
 assert.equal(readOnlyCall('COMPOSIO_MULTI_EXECUTE_TOOL',{tools:[{tool_slug:'TELEGRAM_GET_CHAT'}]}),true);
 assert.equal(readOnlyCall('COMPOSIO_MULTI_EXECUTE_TOOL',{tools:[{tool_slug:'TELEGRAM_GET_CHAT'},{tool_slug:'TELEGRAM_SEND_PHOTO'}]}),false);
 assert.equal(readOnlyCall('COMPOSIO_REMOTE_BASH_TOOL',{}),false);
});
test('parses JSON and SSE MCP replies',()=>{
 const result={jsonrpc:'2.0',id:1,result:{tools:[]}};
 assert.deepEqual(parseMcp(JSON.stringify(result)),result);
 assert.deepEqual(parseMcp(`event: message\ndata: ${JSON.stringify(result)}\n\n`),result);
});
test('rejects a receipt for another chat or an unconfirmed send', async()=>{
 const { confirmedReceipt } = await import('../agent.mjs');
 assert.throws(()=>confirmedReceipt({successful:true,data:{ok:true,result:{message_id:159,chat:{id:123}}}}));
 assert.throws(()=>confirmedReceipt({successful:false,data:{ok:false}}));
 assert.equal(confirmedReceipt({successful:true,data:{ok:true,result:{message_id:159,chat:{id:-1004350521393}}}}).message_id,159);
});
test('extracts source cover URLs with attribute reordering and HTML entities', async()=>{
 const { extractCovers } = await import('../agent.mjs');
 assert.deepEqual(extractCovers('<meta content="/photo.jpg?a=1&amp;b=2" property="og:image"><meta name="twitter:image" content="https://cdn.example.com/cover.png">','https://example.com/story'), ['https://example.com/photo.jpg?a=1&b=2','https://cdn.example.com/cover.png']);
});
