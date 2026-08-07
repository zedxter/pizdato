#!/usr/bin/env node
/**
 * Evening channel post: pick a hot news item and discuss it as пиздато vs хуёво.
 * Posts to @pizdato_net via the existing mcp-telegram StoreSession.
 *
 * Text generation (preferred): cursor-agent --print --mode ask
 * Fallback: OPENROUTER/GROQ/OPENAI key in ~/.config/pizdato-channel.env
 * Last resort: local template
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { TelegramClient } from "telegram";
import { StoreSession } from "telegram/sessions/index.js";

const CHANNEL = process.env.PIZDATO_CHANNEL || "@pizdato_net";
const TELEGRAM_ENV =
  process.env.TELEGRAM_MCP_ENV || join(homedir(), ".config/telegram-mcp.env");
const CHANNEL_ENV =
  process.env.PIZDATO_CHANNEL_ENV || join(homedir(), ".config/pizdato-channel.env");
const STATE_DIR =
  process.env.PIZDATO_CHANNEL_STATE || join(homedir(), ".local/share/pizdato-channel");
const STATE_FILE = join(STATE_DIR, "evening-posted.json");

function sessionConfig() {
  const accountId = process.env.TELEGRAM_ACCOUNT_ID;
  if (!accountId) {
    throw new Error("TELEGRAM_ACCOUNT_ID missing (set in pizdato-channel.env)");
  }
  const sessionCwd = process.env.TELEGRAM_SESSION_CWD || process.cwd();
  const sessionName =
    process.env.TELEGRAM_SESSION_NAME ||
    join(homedir(), ".telegram-agent/sessions", accountId);
  return { accountId, sessionCwd, sessionName };
}

const FEEDS = [
  // Hottest aggregates first
  "https://news.google.com/rss?hl=ru&gl=RU&ceid=RU:ru",
  "https://news.google.com/rss/headlines/section/topic/WORLD?hl=ru&gl=RU&ceid=RU:ru",
  "https://news.google.com/rss/headlines/section/topic/NATION?hl=ru&gl=RU&ceid=RU:ru",
  // Major outlets
  "https://lenta.ru/rss/news",
  "https://ria.ru/export/rss2/archive/index.xml",
  "https://www.interfax.ru/rss.asp",
  "https://rssexport.rbc.ru/rbcnews/news/30/full.rss",
  "https://www.kommersant.ru/RSS/news.xml",
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://feeds.bbci.co.uk/russian/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://www.theguardian.com/world/rss",
  // Light spice
  "https://habr.com/ru/rss/news/?fl=ru",
];

/** Host → official-ish Telegram channel, if known. */
const SOURCE_TG_BY_HOST = {
  "ria.ru": "https://t.me/rian_ru",
  "rian.ru": "https://t.me/rian_ru",
  "tass.ru": "https://t.me/tass_agency",
  "interfax.ru": "https://t.me/interfaxonline",
  "rbc.ru": "https://t.me/rbc_news",
  "kommersant.ru": "https://t.me/kommersant",
  "lenta.ru": "https://t.me/lentaru",
  "bbc.com": "https://t.me/bbcrussian",
  "bbc.co.uk": "https://t.me/bbcrussian",
  "meduza.io": "https://t.me/meduzalive",
  "currenttime.tv": "https://t.me/currenttimeradio",
  "dw.com": "https://t.me/dwglavnoe",
  "euronews.com": "https://t.me/euronewsru",
  "rt.com": "https://t.me/rt_russian",
  "forbes.ru": "https://t.me/forbesrussia",
  "vedomosti.ru": "https://t.me/vedomosti",
  "gazeta.ru": "https://t.me/gazetaru",
  "iz.ru": "https://t.me/izvestia",
  "mk.ru": "https://t.me/mk_ru",
  "fontanka.ru": "https://t.me/fontankaspb",
  "habr.com": "https://t.me/habr_com",
  "vc.ru": "https://t.me/vcru",
  "theverge.com": "https://t.me/verge",
  "cnn.com": "https://t.me/cnn",
  "reuters.com": "https://t.me/Reuters",
  "nytimes.com": "https://t.me/nytimes",
  "theguardian.com": "https://t.me/guardian",
  "apnews.com": "https://t.me/APNews",
};

// No war / combat jokes — exclude military and battlefield topics entirely.
const SKIP_RE =
  /сводк[аи]\s+сво|\bсво\b|обстрел|удар(ы|ов|ами)?\b|бпла|беспилот|шахед|дрон[аыуов]?\b|ракетн|баллист|фронт|ВСУ|Минобороны|минобороны|военн|арми[яи]|войн[аыеу]|боевы|бомб[аыуе]|авиаудар|ПВО|пво|мобилизац|контратак|оккупац|террор|израил|газа\b|хамас|хезболл|насильств|расчлен|порно|18\+/i;


function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    // optional
  }
}

function decodeXml(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRss(xml, source) {
  const items = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const block of blocks) {
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const link =
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ||
      block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1];
    const desc =
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ||
      block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1] ||
      "";
    if (!title || !link) continue;
    items.push({
      title: decodeXml(title),
      url: decodeXml(link).split(/\s/)[0],
      summary: decodeXml(desc).slice(0, 500),
      source,
    });
  }
  return items;
}

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "pizdato-channel-bot/1.0", Accept: "application/rss+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`feed ${url} HTTP ${res.status}`);
  return parseRss(await res.text(), url);
}

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { postedUrls: [] };
  }
}

function saveState(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  const urls = [...new Set(state.postedUrls)].slice(-200);
  writeFileSync(STATE_FILE, JSON.stringify({ postedUrls: urls }, null, 2));
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

const OUTLET_TG_BY_NAME = {
  "риа новости": "https://t.me/rian_ru",
  "ria": "https://t.me/rian_ru",
  "тасс": "https://t.me/tass_agency",
  "интерфакс": "https://t.me/interfaxonline",
  "interfax": "https://t.me/interfaxonline",
  "рбк": "https://t.me/rbc_news",
  "rbc": "https://t.me/rbc_news",
  "коммерсантъ": "https://t.me/kommersant",
  "коммерсант": "https://t.me/kommersant",
  "лента.ru": "https://t.me/lentaru",
  "лента": "https://t.me/lentaru",
  "lenta.ru": "https://t.me/lentaru",
  "bbc news": "https://t.me/bbcrussian",
  "bbc": "https://t.me/bbcrussian",
  "би-би-си": "https://t.me/bbcrussian",
  "meduza": "https://t.me/meduzalive",
  "медуза": "https://t.me/meduzalive",
  "reuters": "https://t.me/Reuters",
  "the guardian": "https://t.me/guardian",
  "the new york times": "https://t.me/nytimes",
  "nytimes": "https://t.me/nytimes",
  "cnn": "https://t.me/cnn",
  "forbes": "https://t.me/forbesrussia",
  "известия": "https://t.me/izvestia",
  "газета.ru": "https://t.me/gazetaru",
  "dw": "https://t.me/dwglavnoe",
  "euronews": "https://t.me/euronewsru",
};

function telegramForOutletName(name) {
  const key = String(name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!key) return null;
  if (OUTLET_TG_BY_NAME[key]) return OUTLET_TG_BY_NAME[key];
  for (const [k, v] of Object.entries(OUTLET_TG_BY_NAME)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

function normalizeGoogleNewsItem(item) {
  // Google titles look like: "Headline - Outlet Name"
  if (!/news\.google\.com/i.test(item.url) && !/news\.google\.com/i.test(item.source || "")) {
    return item;
  }
  const m = item.title.match(/^(.*?)\s+[-—]\s+(.+)$/);
  if (!m) return item;
  const headline = m[1].trim();
  const outlet = m[2].trim();
  return {
    ...item,
    title: headline,
    outlet,
    telegram: item.telegram || telegramForOutletName(outlet) || telegramForSource(item.url),
  };
}

function telegramForSource(url) {
  const host = hostOf(url);
  if (!host) return null;
  if (SOURCE_TG_BY_HOST[host]) return SOURCE_TG_BY_HOST[host];
  // match parent domain: news.bbc.co.uk → bbc.co.uk
  const parts = host.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const cand = parts.slice(i).join(".");
    if (SOURCE_TG_BY_HOST[cand]) return SOURCE_TG_BY_HOST[cand];
  }
  return null;
}

function sourceFooter(item) {
  const lines = [`Источник: ${item.url}`];
  const tg = item.telegram || telegramForSource(item.url);
  if (tg) lines.push(`Telegram источника: ${tg}`);
  return lines.join("\n");
}

function titleTokens(title) {
  const stop = new Set([
    "этот", "этого", "после", "перед", "через", "также", "более", "между", "когда",
    "чтобы", "только", "может", "будет", "были", "своей", "своих", "своём", "или",
    "для", "при", "под", "над", "без", "что", "как", "это", "его", "её", "их",
    "the", "and", "for", "with", "from", "that", "this", "are", "was", "were",
    "сообщает", "заявил", "заявила", "рассказал", "стало", "известно",
  ]);
  return String(title || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w));
}

function overlapCount(a, b) {
  const setB = new Set(b);
  let n = 0;
  for (const w of a) if (setB.has(w)) n += 1;
  return n;
}

function scoreItem(item, clusterSize = 1) {
  let score = 8;
  const t = `${item.title} ${item.summary}`;
  if (SKIP_RE.test(t)) score -= 80;

  // Cross-outlet buzz = "горячая" новость
  score += Math.min(clusterSize, 8) * 14;

  // Explicit heat markers
  if (/срочн|главн|эксклюзив|сенсац|скандал|шок|рекорд|вирусн|обсужда|трен|hot|breaking/i.test(t))
    score += 16;
  if (
    /президент|выборы|саммит|санкц|соглашени|перемири|НАТО|Китай|США|Европ|Трамп|Путин|суд|закон|протест|катастроф|землетряс|ураган|нефть|доллар|инфляц|биткои|крипто/i.test(
      t,
    )
  ) {
    score += 10;
  }
  if (/мем|разоблач|необыч|странн/i.test(t)) score += 6;

  // Downrank pure product/IT changelog noise
  if (/релиз\s+версии|обновлен|iPhone|Android|стартап|фреймворк|JavaScript|патч/i.test(t))
    score -= 8;

  if (telegramForSource(item.url)) score += 5;
  if (item.summary.length > 80) score += 2;

  const host = hostOf(item.url);
  if (/news\.google\.com/.test(item.source || "") || /news\.google/.test(host)) score += 8;
  if (/lenta\.ru|ria\.ru|rbc\.ru|bbc\.|nytimes\.|guardian\.|interfax|kommersant|tass/.test(host))
    score += 4;
  if (/habr\.com|theverge\.com/.test(host)) score -= 3;
  return score;
}

async function pickNews() {
  const state = loadState();
  const posted = new Set(state.postedUrls);
  const all = [];
  for (const feed of FEEDS) {
    try {
      all.push(...(await fetchFeed(feed)));
    } catch (e) {
      console.warn(`feed fail ${feed}:`, e.message);
    }
  }

  const fresh = all
    .filter((i) => i.url && !posted.has(i.url))
    .map((i) => {
      const withTg = {
        ...i,
        telegram: telegramForSource(i.url),
      };
      const normalized = normalizeGoogleNewsItem(withTg);
      return {
        ...normalized,
        tokens: titleTokens(normalized.title),
      };
    })
    .filter((i) => !SKIP_RE.test(`${i.title} ${i.summary}`));

  // How often a story is echoed across feeds ≈ how hot/discussed it is
  for (const item of fresh) {
    let cluster = 1;
    for (const other of fresh) {
      if (other === item) continue;
      if (overlapCount(item.tokens, other.tokens) >= 3) cluster += 1;
    }
    item.clusterSize = cluster;
    item.score = scoreItem(item, cluster);
  }

  const candidates = fresh.filter((i) => i.score > 0).sort((a, b) => b.score - a.score);

  if (!candidates.length) throw new Error("no suitable news items");
  const top = candidates[0];
  console.log(
    `picked score=${top.score} cluster=${top.clusterSize} :: ${top.title}`,
  );
  return { item: top, state };
}

function templatePost(item) {
  const short =
    item.summary.length > 220 ? `${item.summary.slice(0, 217).trim()}…` : item.summary;
  return [
    "Вечерний разбор: пиздато или хуёво",
    "",
    `Сегодня в ленте: ${item.title}`,
    "",
    short || "Коротко и по делу — новость уже успела нагреться.",
    "",
    "Пиздато:",
    "если вокруг шумят — значит, мир хотя бы не скучает.",
    "",
    "Хуёво:",
    "когда новость горячая, остывать обычно приходится кому-то другому.",
    "",
    "Цитата дня:",
    "«Не всё то пиздато, что сегодня в топе.»",
    "",
    "Мир ждёт твоего голоса. Остальное — уже легенда:",
    "https://pizdato.net",
    "",
    sourceFooter(item),
  ].join("\n");
}

function buildPrompt(item) {
  const tg = item.telegram || telegramForSource(item.url);
  const sourceLines = [`Источник: ${item.url}`];
  if (tg) sourceLines.push(`Telegram источника: ${tg}`);
  const heat =
    item.clusterSize > 1
      ? `Новость сейчас горячая: похожие заголовки встретились примерно в ${item.clusterSize} лентах.`
      : "Новость из топа/агрегатора — считай её обсуждаемой.";

  return `Ты автор Telegram-канала pizdato.net. Напиши вечерний пост на русском по ГОРЯЧЕЙ новости ниже.

${heat}

ВАЖНО:
- Используй ТОЛЬКО заголовок и краткое описание из этого сообщения. Не пытайся открывать URL, делать Fetch/WebSearch или читать страницы.
- Верни ТОЛЬКО финальный текст поста для канала. Никаких служебных фраз, рассуждений о инструментах, «попробую иначе», «fetch отклонили», markdown.

Стиль: живой, ироничный, с лёгким стёбом, без канцелярита, без эмодзи-спама, без морализаторства.
Вся подача — через оптику бренда: мир делится на «пиздато» и «хуёво».

Структура:
1) Заголовок-строка: «Вечерний разбор: пиздато или хуёво»
2) 2–4 коротких абзаца — пересказ сути своими словами (можно с юмором, факты не выдумывать)
3) Блок «Пиздато:» — 1–2 предложения: что в новости условно «в плюс / смешно-круто / неожиданно бодро»
4) Блок «Хуёво:» — 1–2 предложения: где тут ложка дёгтя / абсурд / цена вопроса
5) Блок «Цитата дня:» — ОДНА новая фраза в кавычках-ёлочках «…».
   Это «мудрость дня» по ЭТОЙ новости: коротко, смешно, остроумно, пересылабельно.
   Обязательно обыграй «пиздато» и/или «хуёво» (можно оба).
   Формат как у афоризмов/пословиц канала и сайта: можно переиначить известную мудрость,
   можно короткий парадокс — но БЕЗ единого шаблона на все посты.
   Не штампуй конструкции вроде «раньше X — теперь Y», «когда A пиздато, а B хуёво…».
   Не банальность («всё сложно», «время покажет»). Одна мысль — один удар.
   Хорошие ориентиры тона:
   «Не всё то пиздато, что с дыркой посередине.»
   «В Сити курс меняют быстро. Особенно на хуёво.»
   «Посадили ИИ сторожить дверь. Он вышел и принёс соседу ключи.»
6) Затем РОВНО две строки CTA:
Мир ждёт твоего голоса. Остальное — уже легенда:
https://pizdato.net
7) В конце РОВНО эти строки источника (не меняй URL):
${sourceLines.join("\n")}

Заголовок: ${item.title}
Кратко: ${item.summary}`;
}

const TECH_LINE_RE =
  /^(fetch|websearch|webs?earch|tool|mcp|ошибка|error|sorry|unable|cannot|can't|не удалось|попробую|отклонил|rejected|timeout|timed out|reading |calling |using the )/i;

function looksLikeTechChatter(line) {
  const t = line.trim();
  if (!t) return false;
  if (TECH_LINE_RE.test(t)) return true;
  if (/fetch\s+отклон/i.test(t)) return true;
  if (/достать текст другим способом/i.test(t)) return true;
  if (/как\s+ИИ[\s-]*агент/i.test(t)) return true;
  return false;
}

/** Strip agent tool narration; keep only channel-ready copy. */
function sanitizePost(raw, item) {
  let text = String(raw || "").trim();
  // Drop markdown fences if any
  text = text.replace(/^```[\s\S]*?```/g, "").trim();

  const marker = "Вечерний разбор:";
  const idx = text.indexOf(marker);
  const strippedPrefix = idx > 0 ? text.slice(0, idx).trim() : "";
  if (idx >= 0) text = text.slice(idx).trim();

  const lines = text.split(/\n/);
  const cleaned = [];
  const junk = [];
  if (strippedPrefix) junk.push(strippedPrefix);

  for (const line of lines) {
    if (looksLikeTechChatter(line) && !line.includes("pizdato.net") && !/^Источник:/i.test(line)) {
      junk.push(line.trim());
      continue;
    }
    cleaned.push(line);
  }

  text = cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  // Glue accidental "....Вечерний" without newline leftovers
  text = text.replace(/([.!?…])\s*(Вечерний разбор:)/g, "$1\n\n$2");

  const ok =
    text.startsWith(marker) &&
    /Пиздато:/i.test(text) &&
    /Хуёво:/i.test(text) &&
    /Цитата дня:/i.test(text) &&
    /[«"].+[»"]/.test(text) &&
    /пиздато|хуёво/i.test(text) &&
    text.includes("pizdato.net");

  return {
    text: ok ? text : null,
    junk: junk.filter(Boolean).join("\n").slice(0, 1500),
    ok,
  };
}

function runCursorAgent(prompt) {
  const { sessionCwd } = sessionConfig();
  const bin = process.env.CURSOR_AGENT_BIN || `${homedir()}/.local/bin/cursor-agent`;
  const args = [
    "-p",
    "--mode",
    "ask",
    "--output-format",
    "text",
    "--trust",
    "--workspace",
    sessionCwd,
  ];
  if (process.env.PIZDATO_CURSOR_MODEL) {
    args.push("--model", process.env.PIZDATO_CURSOR_MODEL);
  }
  args.push(prompt);

  return new Promise((resolvePromise, reject) => {
    const child = spawn(bin, args, {
      env: process.env,
      cwd: sessionCwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("cursor-agent timed out"));
    }, Number(process.env.PIZDATO_CURSOR_TIMEOUT_MS || 180000));

    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const text = out.trim();
      if (code !== 0 || !text) {
        reject(
          new Error(
            `cursor-agent exit ${code}: ${(err || out).slice(0, 400) || "empty output"}`,
          ),
        );
        return;
      }
      resolvePromise(text);
    });
  });
}

async function apiLlmPost(item) {
  const key =
    process.env.OPENROUTER_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.OPENAI_API_KEY;
  if (!key) return null;

  let base = "https://api.openai.com/v1";
  let model = process.env.PIZDATO_LLM_MODEL || "gpt-4.1-mini";
  if (process.env.OPENROUTER_API_KEY) {
    base = "https://openrouter.ai/api/v1";
    model = process.env.PIZDATO_LLM_MODEL || "openai/gpt-4.1-mini";
  } else if (process.env.GROQ_API_KEY) {
    base = "https://api.groq.com/openai/v1";
    model = process.env.PIZDATO_LLM_MODEL || "llama-3.3-70b-versatile";
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(process.env.OPENROUTER_API_KEY
        ? { "HTTP-Referer": "https://pizdato.net", "X-Title": "pizdato-channel" }
        : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        { role: "system", content: "Ты пишешь короткие колонки для канала pizdato.net." },
        { role: "user", content: buildPrompt(item) },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty LLM response");
  return text;
}

async function withClient(fn) {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || "", 10);
  const apiHash = process.env.TELEGRAM_API_HASH || "";
  if (!apiId || !apiHash) throw new Error("TELEGRAM_API_ID / TELEGRAM_API_HASH missing");

  const { accountId, sessionCwd, sessionName } = sessionConfig();
  process.chdir(sessionCwd);
  const client = new TelegramClient(new StoreSession(sessionName), apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.connect();
  if (!(await client.isUserAuthorized())) {
    throw new Error(`Telegram session not authorized for ${accountId}`);
  }
  try {
    return await fn(client);
  } finally {
    await client.disconnect();
  }
}

async function notifyOwner(message) {
  const peer = process.env.PIZDATO_OWNER_PEER || "me";
  await withClient(async (client) => {
    await client.sendMessage(peer, {
      message: `🛠 pizdato evening cron\n\n${message}`.slice(0, 3500),
      linkPreview: false,
    });
  });
}

async function sendChannel(text) {
  await withClient(async (client) => {
    await client.sendMessage(CHANNEL, { message: text, linkPreview: true });
  });
}

async function generatePost(item) {
  const notes = [];
  const useCursor = process.env.PIZDATO_USE_CURSOR_AGENT !== "0";

  if (useCursor) {
    try {
      console.log("generating with cursor-agent...");
      const raw = await runCursorAgent(buildPrompt(item));
      const cleaned = sanitizePost(raw, item);
      if (cleaned.junk) {
        notes.push(`cursor-agent служебный мусор (в канал не ушло):\n${cleaned.junk}`);
      }
      if (cleaned.ok) {
        return { text: cleaned.text, notes };
      }
      notes.push(
        "cursor-agent вернул текст без нужной структуры поста — взял fallback.",
      );
    } catch (e) {
      notes.push(`cursor-agent failed: ${e.message}`);
      console.warn("cursor-agent failed:", e.message);
    }
  }

  try {
    const api = await apiLlmPost(item);
    if (api) {
      const cleaned = sanitizePost(api, item);
      if (cleaned.junk) notes.push(`API LLM junk:\n${cleaned.junk}`);
      if (cleaned.ok) return { text: cleaned.text, notes };
      notes.push("API LLM вернул плохую структуру — шаблон.");
    }
  } catch (e) {
    notes.push(`API LLM failed: ${e.message}`);
    console.warn("API LLM failed:", e.message);
  }

  notes.push("использован локальный шаблон поста");
  return { text: templatePost(item), notes };
}

async function main() {
  loadEnvFile(TELEGRAM_ENV);
  loadEnvFile(CHANNEL_ENV);

  try {
    const { item, state } = await pickNews();
    const { text, notes } = await generatePost(item);

    await sendChannel(text);
    state.postedUrls.push(item.url);
    saveState(state);
    console.log(`posted evening take on: ${item.title}`);
    console.log(text);

    if (notes.length) {
      try {
        await notifyOwner(
          `Пост в канал ушёл, но были тех. замечания:\n\n• ${notes.join("\n• ")}\n\nНовость: ${item.title}\n${item.url}`,
        );
      } catch (e) {
        console.warn("owner notify failed:", e.message);
      }
    }
  } catch (err) {
    console.error(err);
    try {
      await notifyOwner(`Вечерний пост НЕ опубликован.\n\n${err?.stack || err}`);
    } catch (e) {
      console.warn("owner notify failed:", e.message);
    }
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}