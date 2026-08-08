import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const STATE_DIR =
  process.env.PIZDATO_CHANNEL_STATE || join(homedir(), ".local/share/pizdato-channel");
const STATE_FILE = join(STATE_DIR, "evening-posted.json");

const FEEDS = [
  "https://news.google.com/rss?hl=ru&gl=RU&ceid=RU:ru",
  "https://news.google.com/rss/headlines/section/topic/WORLD?hl=ru&gl=RU&ceid=RU:ru",
  "https://news.google.com/rss/headlines/section/topic/NATION?hl=ru&gl=RU&ceid=RU:ru",
  "https://lenta.ru/rss/news",
  "https://ria.ru/export/rss2/archive/index.xml",
  "https://www.interfax.ru/rss.asp",
  "https://rssexport.rbc.ru/rbcnews/news/30/full.rss",
  "https://www.kommersant.ru/RSS/news.xml",
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://feeds.bbci.co.uk/russian/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://www.theguardian.com/world/rss",
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

const OUTLET_TG_BY_NAME = {
  "риа новости": "https://t.me/rian_ru",
  ria: "https://t.me/rian_ru",
  тасс: "https://t.me/tass_agency",
  интерфакс: "https://t.me/interfaxonline",
  interfax: "https://t.me/interfaxonline",
  рбк: "https://t.me/rbc_news",
  rbc: "https://t.me/rbc_news",
  коммерсантъ: "https://t.me/kommersant",
  коммерсант: "https://t.me/kommersant",
  "лента.ru": "https://t.me/lentaru",
  лента: "https://t.me/lentaru",
  "lenta.ru": "https://t.me/lentaru",
  "bbc news": "https://t.me/bbcrussian",
  bbc: "https://t.me/bbcrussian",
  "би-би-си": "https://t.me/bbcrussian",
  meduza: "https://t.me/meduzalive",
  медуза: "https://t.me/meduzalive",
  reuters: "https://t.me/Reuters",
  "the guardian": "https://t.me/guardian",
  "the new york times": "https://t.me/nytimes",
  nytimes: "https://t.me/nytimes",
  cnn: "https://t.me/cnn",
  forbes: "https://t.me/forbesrussia",
  известия: "https://t.me/izvestia",
  "газета.ru": "https://t.me/gazetaru",
  dw: "https://t.me/dwglavnoe",
  euronews: "https://t.me/euronewsru",
};

// No war / combat jokes — exclude military and battlefield topics entirely.
const SKIP_RE =
  /сводк[аи]\s+сво|\bсво\b|обстрел|удар(ы|ов|ами)?\b|бпла|беспилот|шахед|дрон[аыуов]?\b|ракетн|баллист|фронт|ВСУ|Минобороны|минобороны|военн|арми[яи]|войн[аыеу]|боевы|бомб[аыуе]|авиаудар|ПВО|пво|мобилизац|контратак|оккупац|террор|израил|газа\b|хамас|хезболл|насильств|расчлен|порно|18\+/i;

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
    headers: {
      "User-Agent": "pizdato-channel-bot/1.0",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`feed ${url} HTTP ${res.status}`);
  return parseRss(await res.text(), url);
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|br|li|h[1-6]|tr|article|section)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return " ";
      }
    })
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractCanonicalUrl(html, baseUrl) {
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      try {
        return new URL(m[1], baseUrl).href;
      } catch {
        // ignore
      }
    }
  }
  return null;
}

/**
 * Download article page and return plain text for LLM verdict.
 * Follows redirects; best-effort for Google News wrappers.
 */
export async function fetchArticleBody(url, { maxChars = 7000 } = {}) {
  const ua =
    "Mozilla/5.0 (compatible; pizdato-channel-bot/1.1; +https://pizdato.net)";
  const notes = [];
  let current = url;

  const get = async (target) => {
    const res = await fetch(target, {
      headers: {
        "User-Agent": ua,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`article HTTP ${res.status}`);
    const finalUrl = res.url || target;
    const html = await res.text();
    return { finalUrl, html };
  };

  try {
    let { finalUrl, html } = await get(current);

    // Google News often wraps the publisher page — hop to canonical if different.
    if (/news\.google\.com/i.test(finalUrl) || /news\.google\.com/i.test(current)) {
      const canon = extractCanonicalUrl(html, finalUrl);
      if (canon && !/news\.google\.com/i.test(canon)) {
        notes.push(`resolved google news → ${canon}`);
        ({ finalUrl, html } = await get(canon));
      } else {
        notes.push("google news wrapper; using page text as-is");
      }
    }

    let text = htmlToText(html);
    // Prefer <article> slice if present and long enough.
    const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
    if (articleMatch) {
      const articleText = htmlToText(articleMatch[0]);
      if (articleText.length > 400) text = articleText;
    }

    text = text.replace(/\s+\n/g, "\n").trim();
    if (text.length < 120) {
      notes.push(`thin article body (${text.length} chars)`);
    }
    if (text.length > maxChars) {
      text = `${text.slice(0, maxChars).trim()}…`;
    }

    return { text, finalUrl, notes };
  } catch (e) {
    notes.push(`article fetch failed: ${e.message}`);
    return { text: "", finalUrl: url, notes };
  }
}

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { postedUrls: [] };
  }
}

export function savePostedState(state) {
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

export function telegramForSource(url) {
  const host = hostOf(url);
  if (!host) return null;
  if (SOURCE_TG_BY_HOST[host]) return SOURCE_TG_BY_HOST[host];
  const parts = host.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const cand = parts.slice(i).join(".");
    if (SOURCE_TG_BY_HOST[cand]) return SOURCE_TG_BY_HOST[cand];
  }
  return null;
}

function normalizeGoogleNewsItem(item) {
  if (
    !/news\.google\.com/i.test(item.url) &&
    !/news\.google\.com/i.test(item.source || "")
  ) {
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
    telegram:
      item.telegram || telegramForOutletName(outlet) || telegramForSource(item.url),
  };
}

export function sourceFooter(item) {
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

  score += Math.min(clusterSize, 8) * 14;

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

/** Heavy / dull topics — not for evening «абсурд дня». */
const EVENING_HARD_SKIP_RE =
  /санкц|выборы|президент|правительств|госдум|сенат|конгресс|парламент|трамп|путин|байден|нато|мид\b|дипломат|законпроект|депутат|министр|минпром|минвест|минюст|кремл|белый дом|мобилиз|израил|хамас|орган(ы|ов)?\b|донор|трансплант|пересадк|инфаркт|онколог|рак\b|погиб|убит|теракт|расстрел|катастроф|землетряс|ураган|наводнен|газпром|хранилищ|инфляц|ликвидн|госконтракт|госзакуп|мигрант|нежелательн|дериватив|заблокированн|умерл|умерла|\bумер\b|эвтанази|суицид|похорон/i;

/** Signals that a story is absurd / funny / delightfully weird. */
const ABSURD_RE =
  /абсурд|курьёз|курьез|смешн|забавн|розыгрыш|опечатка|перепутал|вместо\s|сбежал|зоопарк|в квартире|пенсионерк|крокодил|удав|кот[аыу]|собак|попуга|хомяк|капибар|енот|жираф|слон|обезьян|пингвин|утка|белка|медвед(?!ев)|голый|трусах|блогер|лерчек|титок|\bмем\b|rm\s*-rf|удалила данные|nintendo|mamma mia|кофе натощак|утренней привычк|каникул|вирусн(ых|ой)?\s+игр|суд обязал|роскошн\w*\s+автомобил|автомобил\w*\s+блогер|claude|chatgpt|взломал.*ии|ии.*взлом|антроп/i;

function absurdScore(item) {
  const t = `${item.title} ${item.summary || ""}`;
  if (EVENING_HARD_SKIP_RE.test(t) || SKIP_RE.test(t)) return -999;
  if (/news\.google\.com/i.test(item.url)) return -40;

  // Gate: without an absurd/funny signal, keep score ≤0 so evening won't pick it.
  if (!ABSURD_RE.test(t)) {
    return Math.min(item.clusterSize || 1, 3) - 5;
  }

  let s = 60;
  s += Math.min(item.clusterSize || 1, 6) * 4;
  s += Math.max(0, item.score || 0) * 0.1;

  if (/крокодил|удав|зоопарк|сбежал|в квартире|пенсионерк/i.test(t)) s += 45;
  if (/перепутал|опечатка|вместо\s|rm\s*-rf|удалила данные/i.test(t)) s += 40;
  if (/блогер|лерчек|\bмем\b|титок|курьёз|забавн|смешн|абсурд/i.test(t)) s += 28;
  if (/nintendo|mamma mia|кофе|каникул|привычк|roblox|claude|chatgpt/i.test(t)) s += 18;
  if (/habr\.com/i.test(item.url) && /удал|ошиб|слома|вместо|rm/i.test(t)) s += 12;
  return s;
}

/** Rank RSS items; excludeUrls skips already-seen / already-stored links. */
export async function rankNews({ excludeUrls = [] } = {}) {
  const excluded = new Set(excludeUrls);
  const all = [];
  for (const feed of FEEDS) {
    try {
      all.push(...(await fetchFeed(feed)));
    } catch (e) {
      console.warn(`feed fail ${feed}:`, e.message);
    }
  }

  const fresh = all
    .filter((i) => i.url && !excluded.has(i.url))
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

  for (const item of fresh) {
    let cluster = 1;
    for (const other of fresh) {
      if (other === item) continue;
      if (overlapCount(item.tokens, other.tokens) >= 3) cluster += 1;
    }
    item.clusterSize = cluster;
    item.score = scoreItem(item, cluster);
    item.absurdScore = absurdScore(item);
  }

  return fresh.filter((i) => i.score > 0).sort((a, b) => b.score - a.score);
}

export async function pickNews() {
  return pickAbsurdNews();
}

/** Evening: pick the most absurd / funny story of the day (not hard politics). */
export async function pickAbsurdNews() {
  const state = loadState();
  const ranked = await rankNews({ excludeUrls: state.postedUrls });
  const byAbsurd = [...ranked]
    .filter((i) => (i.absurdScore ?? absurdScore(i)) > 0)
    .sort((a, b) => (b.absurdScore ?? 0) - (a.absurdScore ?? 0));

  let top = byAbsurd[0];
  if (!top) {
    // Soft fallback: least-political leftover by absurdScore (may be low).
    const soft = [...ranked]
      .map((i) => ({ ...i, absurdScore: i.absurdScore ?? absurdScore(i) }))
      .filter((i) => i.absurdScore > -100)
      .sort((a, b) => b.absurdScore - a.absurdScore);
    top = soft[0];
  }
  if (!top) throw new Error("no suitable absurd news items");

  console.log(
    `picked absurd=${top.absurdScore} score=${top.score} cluster=${top.clusterSize} :: ${top.title}`,
  );

  // Enrich summary with article body for a sharper evening take.
  try {
    const fetched = await fetchArticleBody(top.url);
    if (fetched.notes?.length) {
      console.warn("article fetch:", fetched.notes.join("; "));
    }
    if (fetched.text && fetched.text.length > 120) {
      top.summary = fetched.text.slice(0, 1800);
      if (fetched.finalUrl && !/news\.google\.com/i.test(fetched.finalUrl)) {
        top.resolvedUrl = fetched.finalUrl;
      }
    }
  } catch (e) {
    console.warn("article enrich failed:", e.message);
  }

  return { item: top, state };
}
