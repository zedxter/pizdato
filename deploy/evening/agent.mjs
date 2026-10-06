import { readFile, writeFile, rename, mkdir, readdir, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CHAT = -1004350521393;
const ACCOUNT = 'pizdato-net-channel';
const CTA = 'Мир ждёт твоего голоса: https://pizdato.net';
export function validateDraft(d) {
  if (typeof d.caption !== 'string' || [...d.caption].length > 950 || d.caption.length > 1024 || !d.caption.endsWith(CTA)) throw new Error('Caption must be <=950 characters, <=1024 UTF-16 units and end with the exact CTA');
  const words = String(d.wisdom || '').match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu) || [];
  if (words.length < 10 || words.length > 15 || !d.caption.includes(d.wisdom)) throw new Error('Wisdom must appear in the caption and contain 10–15 words');
  if (!/дядя Миша/iu.test(d.caption) || !/пиздато/iu.test(d.caption) || !/ху[её]во/iu.test(d.caption) || /\bTODO\b|я (наш[её]л|вижу|думаю)/iu.test(d.caption)) throw new Error('Editorial voice validation failed');
  if (new URL(d.source_url).protocol !== 'https:') throw new Error('Source must use HTTPS');
  return d;
}
export function extractCovers(html, source) {
  const images = [];
  for (const tag of html.match(/<meta\b[^>]*(?:og:image|twitter:image)[^>]*>/gi) || []) {
    const content = tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (!content) continue;
    try { images.push(new URL(content.replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))), source).href); } catch {}
  }
  return images;
}
export function confirmedReceipt(response) {
  const receipt = response?.data?.result;
  if (!response?.successful || !response.data?.ok || !Number.isInteger(receipt?.message_id) || receipt.chat?.id !== CHAT) throw new Error('Send not confirmed; pending intent retained for reconciliation');
  return receipt;
}
export function readOnlyCall(name, args) {
  if (['COMPOSIO_SEARCH_TOOLS', 'COMPOSIO_GET_TOOL_SCHEMAS'].includes(name)) return true;
  return name === 'COMPOSIO_MULTI_EXECUTE_TOOL' && Array.isArray(args.tools) && args.tools.length > 0 && args.tools.every(t => t.tool_slug === 'TELEGRAM_GET_CHAT');
}
export function parseMcp(text) {
  if (text.trim().startsWith('{')) return JSON.parse(text);
  for (const block of text.split(/\r?\n\r?\n/).reverse()) {
    const data = block.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
    if (data) return JSON.parse(data);
  }
  throw new Error('Empty MCP response');
}
export async function loadEnv(path) {
  let text;
  try { text = await readFile(path, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
}
export class Composio {
  id = 0;
  session;
  async rpc(method, params, notify = false) {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'x-consumer-api-key': process.env.COMPOSIO_CONSUMER_KEY, 'MCP-Protocol-Version': '2025-03-26' };
    if (this.session) headers['Mcp-Session-Id'] = this.session;
    const body = { jsonrpc: '2.0', method, params, ...(!notify && { id: ++this.id }) };
    const res = await fetch('https://connect.composio.dev/mcp', { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`Composio HTTP ${res.status}`);
    this.session = res.headers.get('mcp-session-id') || this.session;
    if (notify || res.status === 202) return;
    const reply = parseMcp(await res.text());
    if (reply.error) throw new Error(`Composio RPC error ${reply.error.code}`);
    return reply.result;
  }
  async connect() {
    await this.rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'pizdato-evening', version: '1.0' } });
    await this.rpc('notifications/initialized', {}, true);
  }
  async call(name, args) {
    const result = await this.rpc('tools/call', { name, arguments: args });
    if (result.isError) throw new Error(`Composio tool ${name} failed`);
    return result;
  }
}
export function unpack(result) {
  if (result.structuredContent) return result.structuredContent;
  for (const item of result.content || []) {
    if (item.type === 'text') { try { return JSON.parse(item.text); } catch {} }
  }
  throw new Error('Composio result has no structured payload');
}
export async function chat(messages, tools, options = {}) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://pizdato.net', 'X-Title': options.title || 'pizdato-evening' },
    body: JSON.stringify({ model: options.model || process.env.PIZDATO_EVENING_MODEL || 'deepseek/deepseek-v4.1-flash', messages, ...(tools?.length && { tools, tool_choice: 'auto' }), temperature: 0.7, max_tokens: options.maxTokens || 5000 }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
  const data = await res.json();
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error('OpenRouter returned no message');
  console.log(`OpenRouter model=${data.model}, tokens=${data.usage?.total_tokens || 'unknown'}`);
  return message;
}
async function publicFetch(url, options = {}) {
  if (new URL(url).protocol !== 'https:') throw new Error('Only HTTPS URLs are supported');
  const res = await fetch(url, { ...options, headers: { 'User-Agent': 'pizdato-evening/1.0', ...options.headers }, signal: AbortSignal.timeout(30000) });
  if (!res.ok || new URL(res.url).protocol !== 'https:') throw new Error(`Source HTTP ${res.status}`);
  return res;
}
export async function atomicWrite(path, text) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, text, { mode: 0o600 });
  await rename(temp, path);
}
function tool(name, description, properties, required = []) {
  return { type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } };
}
const str = { type: 'string' };
async function run() {
  const mode = process.argv[2] || 'publish';
  if (!['publish', '--dry-run', '--check'].includes(mode)) throw new Error('Unknown mode');
  await loadEnv(process.env.PIZDATO_CHANNEL_ENV || join(homedir(), '.config/pizdato-channel.env'));
  await loadEnv(process.env.PIZDATO_EVENING_ENV || join(homedir(), '.config/pizdato-evening.env'));
  if (!process.env.OPENROUTER_API_KEY || !process.env.COMPOSIO_CONSUMER_KEY) throw new Error('OpenRouter or Composio credential missing');
  const vault = process.env.PIZDATO_EVENING_VAULT || '/home/danil/vault/pizdato';
  const state = process.env.PIZDATO_EVENING_STATE || join(homedir(), '.local/state/pizdato-evening');
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  const marker = join(vault, `published/telegram/evening-${day}.md`);
  const pending = join(state, `evening-${day}.pending`);
  await mkdir(state, { recursive: true });
  const polish = (await Promise.all(['SKILL.md', 'KNOWN_PATTERNS.md', 'STYLE_PATTERNS.md', 'REFERENCE_CORRECTNESS.md'].map(n => readFile(join(ROOT, 'resources/post-polish', n), 'utf8')))).join('\n\n');
  const mcp = new Composio();
  await mcp.connect();
  const discovery = unpack(await mcp.call('COMPOSIO_SEARCH_TOOLS', { queries: [{ use_case: 'Get Telegram channel information and send a photo with a plain caption', known_fields: `chat_id:${CHAT}, account:${ACCOUNT}` }], search_strategy: 'tool_search', session: { generate_id: true } }));
  const sessionId = discovery.data?.session?.id || discovery.session?.id;
  if (!sessionId) throw new Error('Composio search session missing');
  const status = discovery.data?.toolkit_connection_statuses || discovery.toolkit_connection_statuses || [];
  if (!status.some(s => s.toolkit === 'telegram' && s.accounts?.some(a => a.alias === ACCOUNT && a.status === 'ACTIVE'))) throw new Error('Named Telegram account is not ACTIVE');
  const execute = async tools => unpack(await mcp.call('COMPOSIO_MULTI_EXECUTE_TOOL', { tools, session_id: sessionId, current_step: 'EVENING_PUBLICATION', sync_response_to_workbench: false }));
  const info = await execute([{ tool_slug: 'TELEGRAM_GET_CHAT', account: ACCOUNT, arguments: { chat_id: CHAT } }]);
  const channel = info.data?.results?.[0]?.response?.data || info.results?.[0]?.response?.data;
  if (!channel?.ok || channel.result?.id !== CHAT || channel.result?.username !== 'pizdato_net') throw new Error('Channel identity mismatch');
  if (mode === '--check') {
    const answer = await chat([{ role: 'user', content: 'Return exactly OPENROUTER_OK. This is a non-publishing connection check.' }]);
    if (!answer.content?.includes('OPENROUTER_OK')) throw new Error('OpenRouter preflight failed');
    console.log('PREFLIGHT_OK: OpenRouter, named Composio account, channel and post-polish resources verified.');
    return;
  }
  const schemas = unpack(await mcp.call('COMPOSIO_GET_TOOL_SCHEMAS', { tool_slugs: ['TELEGRAM_SEND_PHOTO'], session_id: sessionId }));
  // Discovery establishes the photo slug; publication is performed only by this host after validation.
  const available = await mcp.rpc('tools/list', {});
  const remote = available.tools.filter(t => ['COMPOSIO_SEARCH_TOOLS', 'COMPOSIO_GET_TOOL_SCHEMAS', 'COMPOSIO_MULTI_EXECUTE_TOOL'].includes(t.name)).map(t => tool(t.name, t.description, t.inputSchema.properties || {}, t.inputSchema.required || []));
  const verifiedImages = new Set();
  const verifiedSources = new Set();
  const sourceCovers = new Map();
  const local = [
    tool('search_web', 'Search the public web; returns Bing RSS results. Follow original sources and verify facts.', { query: str }, ['query']),
    tool('fetch_url', 'Fetch an HTTPS news article/API. Returns readable text, raw OG meta tags and links.', { url: str }, ['url']),
    tool('validate_cover', 'Validate a public HTTPS source image using HEAD then GET, image MIME and nonempty bytes.', { url: str }, ['url']),
    tool('read_context', 'Read recent canonical evening posts and live-site context; never invent weekly data.', {}),
    tool('complete_post', 'Submit the final post after post-polish. Requires a validated source cover and fetched source. Host validates and publishes once, or saves dry-run only.', { caption: str, wisdom: str, source_url: str, image_url: str, category: str }, ['caption', 'wisdom', 'source_url', 'image_url', 'category']),
  ];
  const prompt = await readFile(join(ROOT, 'prompt.md'), 'utf8');
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Europe/Berlin' }).format(new Date());
  const messages = [{ role: 'system', content: `${prompt}\nRun date ${day}, weekday ${weekday}, mode ${mode}. Tools and all send/archive operations are managed by the host. Do not create pending records yourself. You have no send tools; finish by complete_post. Never generate an image or send plain text. Source covers only.\nPost-polish resources:\n${polish}` }, { role: 'user', content: `Prepare the evening post for ${day} (${weekday}). ${mode === '--dry-run' ? 'DRY RUN: no publication.' : 'Scheduled publication is authorized.'}` }];
  let draft;
  for (let step = 0; step < 30 && !draft; step++) {
    const message = await chat(messages, [...local, ...remote]);
    messages.push(message);
    if (!message.tool_calls?.length) {
      messages.push({ role: 'user', content: 'Use the tools to verify a real news source and its cover, then submit complete_post. A prose answer does not finish this job.' });
      continue;
    }
    for (const call of message.tool_calls) {
      let result;
      try {
        const args = JSON.parse(call.function.arguments);
        const name = call.function.name;
        console.log(`Tool: ${name}`);
        if (name === 'search_web') {
          const res = await publicFetch(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(args.query)}`);
          result = (await res.text()).slice(0, 22000);
        } else if (name === 'fetch_url') {
          const res = await publicFetch(args.url);
          const html = (await res.text()).slice(0, 1500000);
          const meta = html.match(/<meta\b[^>]*(?:og:image|twitter:image)[^>]*>/gi) || [];
          const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].slice(0, 60).map(m => ({ url: m[1], text: m[2].replace(/<[^>]*>/g, '') }));
          const text = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 24000);
          verifiedSources.add(args.url);
          const covers = extractCovers(html, res.url);
          sourceCovers.set(args.url, covers);
          result = { url: res.url, meta, covers, text, links };
        } else if (name === 'validate_cover') {
          try { const head = await publicFetch(args.url, { method: 'HEAD' }); console.log(`Cover HEAD ${head.status}`); } catch { console.log('Cover HEAD unavailable; validating GET'); }
          const res = await publicFetch(args.url);
          if (!res.headers.get('content-type')?.startsWith('image/')) throw new Error('Cover is not an image');
          const bytes = (await res.arrayBuffer()).byteLength;
          if (!bytes || bytes > 10 * 1024 * 1024) throw new Error('Cover empty or larger than Telegram 10MB photo limit');
          verifiedImages.add(args.url);
          result = { valid: true, url: res.url, bytes, mime: res.headers.get('content-type') };
        } else if (name === 'read_context') {
          const dir = join(vault, 'posts');
          const names = (await readdir(dir)).filter(n => /^evening-\d{4}-\d{2}-\d{2}\.md$/.test(n)).sort().slice(-14);
          result = await Promise.all(names.map(async n => ({ name: n, text: (await readFile(join(dir, n), 'utf8')).slice(0, 4000) })));
        } else if (name === 'complete_post') {
          validateDraft(args);
          if (!verifiedImages.has(args.image_url) || !verifiedSources.has(args.source_url) || !sourceCovers.get(args.source_url)?.includes(args.image_url)) throw new Error('Fetch the source and validate an OG/Twitter cover from that same source first');
          draft = args;
          result = { accepted: true };
        } else {
          if (!readOnlyCall(name, args)) throw new Error('Only discovery and read-only channel checks are allowed from the model');
          result = await mcp.call(name, args);
        }
      } catch (error) { result = { error: error.message }; }
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 50000) });
    }
  }
  if (!draft) throw new Error('No verified draft within the tool-call budget');
  const archiveText = `# Evening post ${day}\n\nCategory: ${draft.category}\nSource: ${draft.source_url}\nImage: ${draft.image_url}\nCharacters: ${[...draft.caption].length}\n\n${draft.caption}\n`;
  if (mode === '--dry-run') {
    await atomicWrite(join(state, `drafts/evening-${day}.md`), archiveText);
    console.log(`DRY_RUN_OK\n${archiveText}`);
    return;
  }
  const nowDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  if (day !== nowDay) throw new Error('Local date changed during preparation');
  try { await readFile(marker); console.log('Already published; skipping.'); return; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const archive = join(vault, `posts/evening-${day}.md`);
  await atomicWrite(archive, archiveText);
  await writeFile(pending, JSON.stringify({ day, account: ACCOUNT, chat_id: CHAT, archive, at: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
  const result = await execute([{ tool_slug: 'TELEGRAM_SEND_PHOTO', account: ACCOUNT, arguments: { chat_id: CHAT, photo: draft.image_url, caption: draft.caption } }]);
  const response = result.data?.results?.[0]?.response || result.results?.[0]?.response;
  const receipt = confirmedReceipt(response);
  const receiptText = `\nMessage ID: ${receipt.message_id}\nPost: https://t.me/pizdato_net/${receipt.message_id}\nPublished: ${new Date().toISOString()}\n`;
  await atomicWrite(marker, receiptText);
  await atomicWrite(archive, archiveText + receiptText);
  await unlink(pending);
  console.log(`PUBLISHED https://t.me/pizdato_net/${receipt.message_id}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(e => { console.error(`ERROR: ${e.message}`); process.exitCode = 1; });
}
