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

export async function pickNews() {
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
  console.log(`picked score=${top.score} cluster=${top.clusterSize} :: ${top.title}`);
  return { item: top, state };
}
