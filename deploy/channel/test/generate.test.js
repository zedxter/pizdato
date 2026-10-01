import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { generateVerdict, generatePost, templatePost } from '../lib/generate.js';

const realFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const item = {
  title: 'В городе открыли бесплатный парк',
  summary: 'Жителям доступен новый парк.',
  url: 'https://example.com/news/park',
  articleText: 'В городе открыли бесплатный парк с прогулочными дорожками и детской площадкой. Вход свободный для всех жителей.',
};
const expected = { verdict: 'pizdato', reason: 'Парк бесплатный — прогулки теперь без чека.' };
const completion = (content, extra = {}) => Response.json({ choices: [{ message: { content }, ...extra }] });
beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'test-secret';
  delete process.env.PIZDATO_LLM_MODEL;
  delete process.env.PIZDATO_LLM_TIMEOUT_MS;
  delete process.env.TELEGRAM_ACCOUNT_ID;
  process.env.CURSOR_AGENT_BIN = '/nonexistent/cursor-agent';
});
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});

test('hourly verdict uses DeepSeek and supplied article without Cursor or Telegram', async () => {
  let called = false;
  globalThis.fetch = async (url, options) => {
    called = true;
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    const request = JSON.parse(options.body);
    assert.equal(request.model, 'deepseek/deepseek-v3.2');
    assert.ok(request.messages[1].content.includes(item.articleText));
    assert.ok(options.signal instanceof AbortSignal);
    assert.ok(!request.plugins?.some((p) => p.id === 'web'));
    return completion(JSON.stringify(expected));
  };
  const result = await generateVerdict(item);
  assert.ok(called);
  assert.equal(result.verdict, expected.verdict);
  assert.equal(result.reason, expected.reason);
  assert.deepEqual(result.notes, []);
  assert.equal(result.item.articleText, item.articleText);
});

test('truncated verdict falls back even when partial output looks valid', async () => {
  globalThis.fetch = async () => completion(JSON.stringify(expected), { finish_reason: 'length' });
  const result = await generateVerdict(item);
  assert.ok(result.notes.some((note) => note.includes('эвристика')));
  assert.notEqual(result.reason, expected.reason);
});

test('transport errors cannot leak credentials into notes or console', async () => {
  const warnings = [];
  const warn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  globalThis.fetch = async () => { throw new Error('transport leaked test-secret'); };
  try {
    const result = await generateVerdict(item);
    assert.ok(result.notes.some((note) => note.includes('эвристика')));
    assert.ok(![...result.notes, ...warnings].join().includes('test-secret'));
  } finally { console.warn = warn; }
});

test('configured deadline aborts a stalled verdict request', async () => {
  process.env.PIZDATO_LLM_TIMEOUT_MS = '10';
  globalThis.fetch = async (_, { signal }) => new Promise((resolve, reject) => {
    const guard = setTimeout(() => resolve(completion(JSON.stringify(expected))), 100);
    signal.addEventListener('abort', () => { clearTimeout(guard); reject(signal.reason); }, { once: true });
  });
  const result = await generateVerdict(item);
  assert.ok(result.notes.some((note) => note.includes('timed out')));
  assert.ok(result.notes.some((note) => note.includes('эвристика')));
});

test('evening copy uses the same DeepSeek configuration without Cursor', async () => {
  const text = templatePost(item).replace('Не всё то пиздато, что сегодня в топе.', 'Парк пиздато, когда касса в нём не выросла.');
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(JSON.parse(options.body).model, 'deepseek/deepseek-v3.2');
    return completion(text);
  };
  const result = await generatePost(item);
  assert.equal(result.text, text);
  assert.deepEqual(result.notes, []);
});

for (const [name, respond] of [
  ['HTTP error', () => new Response('private-body test-secret', { status: 401 })],
  ['embedded API error', () => Response.json({ error: { message: 'private-body test-secret' }, choices: [{ message: { content: JSON.stringify(expected) } }] })],
  ['invalid response JSON', () => new Response('private-body test-secret')],
  ['empty completion', () => completion('')],
  ['non-string completion', () => completion({ private: 'test-secret' })],
  ['malformed verdict JSON', () => completion('not json')],
  ['unsupported verdict', () => completion('{"verdict":"unknown","reason":"Причина"}')],
  ['empty reason', () => completion('{"verdict":"pizdato","reason":""}')],
]) {
  test(`${name} preserves hourly heuristic and evening template without leaking provider data`, async () => {
    const warnings = [];
    const warn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    globalThis.fetch = async () => respond();
    try {
      const verdict = await generateVerdict({ ...item, title: 'В городе произошла авария' });
      assert.equal(verdict.verdict, 'huyevo');
      assert.ok(verdict.notes.some((note) => note.includes('эвристика')));
      const post = await generatePost(item);
      assert.equal(post.text, templatePost(item));
      assert.ok(post.notes.length > 0);
      const diagnostics = [...verdict.notes, ...post.notes, ...warnings].join();
      assert.ok(!diagnostics.includes('test-secret'));
      assert.ok(!diagnostics.includes('private-body'));
    } finally { console.warn = warn; }
  });
}

test('missing OpenRouter key uses local fallbacks without another provider', async () => {
  delete process.env.OPENROUTER_API_KEY;
  process.env.GROQ_API_KEY = 'unused';
  process.env.OPENAI_API_KEY = 'unused';
  globalThis.fetch = async () => { assert.fail('No provider request without OpenRouter key'); };
  const verdict = await generateVerdict(item);
  assert.ok(verdict.notes.some((note) => note.includes('OPENROUTER_API_KEY')));
  assert.ok(verdict.notes.some((note) => note.includes('эвристика')));
  assert.equal((await generatePost(item)).text, templatePost(item));
});

test('configured model override applies to both generators', async () => {
  process.env.PIZDATO_LLM_MODEL = 'deepseek/override';
  globalThis.fetch = async (_, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'deepseek/override');
    return completion(body.temperature === 0.3 ? JSON.stringify(expected) : templatePost(item));
  };
  assert.deepEqual((await generateVerdict(item)).notes, []);
  assert.deepEqual((await generatePost(item)).notes, []);
});

for (const timeout of ['NaN', '0', '-1', '1.5', '999999999999']) {
  test(`invalid timeout ${timeout} still allows a bounded request`, async () => {
    process.env.PIZDATO_LLM_TIMEOUT_MS = timeout;
    globalThis.fetch = async (_, { signal }) => {
      assert.ok(signal instanceof AbortSignal);
      assert.equal(signal.aborted, false);
      return completion(JSON.stringify(expected));
    };
    assert.deepEqual((await generateVerdict(item)).notes, []);
  });
}

test('fetches missing article body and carries its image into the verdict result', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    if (url === item.url) return new Response(`<html><head><meta property="og:image" content="https://example.com/park.jpg"></head><body><article><p>${item.articleText.repeat(4)}</p></article></body></html>`);
    assert.ok(JSON.parse(options.body).messages[1].content.includes('прогулочными дорожками'));
    return completion(JSON.stringify(expected));
  };
  const result = await generateVerdict({ ...item, articleText: null });
  assert.equal(result.reason, expected.reason);
  assert.ok(result.item.articleText.includes('прогулочными дорожками'));
  assert.equal(result.item.imageUrl, 'https://example.com/park.jpg');
  assert.deepEqual(calls, [item.url, 'https://openrouter.ai/api/v1/chat/completions']);
});

test('unreachable article rejects before requesting inference', async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    assert.equal(url, item.url);
    calls++;
    return new Response('not found', { status: 404 });
  };
  await assert.rejects(generateVerdict({ ...item, articleText: null }), /article URL not reachable/);
  assert.equal(calls, 1);
});

for (const reason of [42, true, { detail: 'Причина' }, ['Причина']]) {
  test(`non-string reason ${JSON.stringify(reason)} is rejected`, async () => {
    globalThis.fetch = async () => completion(JSON.stringify({ verdict: 'pizdato', reason }));
    const result = await generateVerdict(item);
    assert.ok(result.notes.some((note) => note.includes('эвристика')));
    assert.ok(!result.reason.includes('[object Object]'));
  });
}
