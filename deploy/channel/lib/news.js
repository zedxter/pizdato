import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const STATE_DIR =
  process.env.PIZDATO_CHANNEL_STATE || join(homedir(), ".local/share/pizdato-channel");
const STATE_FILE = join(STATE_DIR, "evening-posted.json");

const FEEDS = [
  // Wire / general (kept for coverage; absurd filter + dedupe cut the noise)
  "https://news.google.com/rss?hl=ru&gl=RU&ceid=RU:ru",
  "https://news.google.com/rss/headlines/section/topic/WORLD?hl=ru&gl=RU&ceid=RU:ru",
  "https://news.google.com/rss/headlines/section/topic/NATION?hl=ru&gl=RU&ceid=RU:ru",
  "https://lenta.ru/rss/news",
  "https://ria.ru/export/rss2/archive/index.xml",
  "https://www.interfax.ru/rss.asp",
  "https://rssexport.rbc.ru/rbcnews/news/30/full.rss",
  "https://www.kommersant.ru/RSS/news.xml",
  "https://meduza.io/rss/all",
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://feeds.bbci.co.uk/russian/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://www.theguardian.com/world/rss",

  // Science / space / odd discoveries
  "https://nplus1.ru/rss",
  "https://elementy.ru/rss/news",
  "https://naked-science.ru/feed",
  "https://www.sciencedaily.com/rss/top.xml",
  "https://www.nasa.gov/rss/dyn/breaking_news.rss",
  "https://www.space.com/feeds/all",
  "https://www.livescience.com/feeds/all",
  "https://newatlas.com/index.rss",
  "https://www.atlasobscura.com/feeds/latest",
  "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
  "https://www.theguardian.com/science/rss",
  "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml",

  // Tech / gadgets (more glitches & quirks than wire politics)
  "https://habr.com/ru/rss/news/?fl=ru",
  "https://vc.ru/rss",
  "https://www.theverge.com/rss/index.xml",
  "https://feeds.arstechnica.com/arstechnica/index",
  "https://www.ixbt.com/export/news.rss",
  "https://3dnews.ru/news/rss/",
  "https://feeds.bbci.co.uk/news/technology/rss.xml",
  "https://www.theguardian.com/technology/rss",
  "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",

  // Quirky / offbeat
  "https://www.mentalfloss.com/feed",
  "https://www.boredpanda.com/feed/",
];

/** Feeds biased to Russian copy — preferred for hourly (курьёзы / абсурд). */
const FEEDS_HOURLY = [
  "https://news.google.com/rss?hl=ru&gl=RU&ceid=RU:ru",
  "https://lenta.ru/rss/news",
  "https://ria.ru/export/rss2/archive/index.xml",
  "https://www.interfax.ru/rss.asp",
  "https://rssexport.rbc.ru/rbcnews/news/30/full.rss",
  "https://www.kommersant.ru/RSS/news.xml",
  "https://meduza.io/rss/all",
  "https://feeds.bbci.co.uk/russian/rss.xml",
  "https://nplus1.ru/rss",
  "https://elementy.ru/rss/news",
  "https://naked-science.ru/feed",
  "https://habr.com/ru/rss/news/?fl=ru",
  "https://vc.ru/rss",
  "https://www.ixbt.com/export/news.rss",
  "https://3dnews.ru/news/rss/",
];

/** Hosts that skew toward weird / science / tech — boost absurd selection. */
const QUIRK_HOST_RE =
  /nplus1\.ru|elementy\.ru|naked-science\.ru|popmech\.ru|sciencedaily\.com|nasa\.gov|space\.com|livescience\.com|newatlas\.com|atlasobscura\.com|mentalfloss\.com|boredpanda\.com|theverge\.com|arstechnica\.com|vc\.ru|ixbt\.com|3dnews\.ru|habr\.com|meduza\.io/i;

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
  "nplus1.ru": "https://t.me/nplusone",
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

/** Best-effort image URL from an RSS/Atom item block (before text stripping). */
function extractRssImage(block, baseUrl) {
  const candidates = [];
  const push = (raw) => {
    if (!raw) return;
    try {
      const href = new URL(decodeXml(raw).split(/\s/)[0], baseUrl || undefined).href;
      if (/^https?:\/\//i.test(href)) candidates.push(href);
    } catch {
      // ignore
    }
  };

  const media =
    block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1] ||
    block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1];
  push(media);

  const enc = block.match(
    /<enclosure[^>]+(?:type=["']image\/[^"']+["'][^>]*url=["']([^"']+)["']|url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["'])/i,
  );
  push(enc?.[1] || enc?.[2]);

  const itunes = block.match(/<itunes:image[^>]+href=["']([^"']+)["']/i)?.[1];
  push(itunes);

  const img = block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  push(img);

  return candidates[0] || null;
}

export function extractOgImage(html, baseUrl) {
  if (!html) return null;
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    try {
      const href = new URL(m[1].trim(), baseUrl || undefined).href;
      if (/^https?:\/\//i.test(href)) return href;
    } catch {
      // ignore
    }
  }
  return null;
}

function parseRss(xml, source) {
  const items = [];
  // RSS 2.0
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
    const url = decodeXml(link).split(/\s/)[0];
    items.push({
      title: decodeXml(title),
      url,
      summary: decodeXml(desc).slice(0, 500),
      source,
      imageUrl: extractRssImage(block, url),
    });
  }
  if (items.length) return items;

  // Atom (e.g. The Verge)
  const entries = xml.split(/<entry[\s>]/i).slice(1);
  for (const block of entries) {
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const linkHref =
      block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] ||
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1];
    const desc =
      block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ||
      block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] ||
      "";
    if (!title || !linkHref) continue;
    const url = decodeXml(linkHref).split(/\s/)[0];
    items.push({
      title: decodeXml(title),
      url,
      summary: decodeXml(desc).slice(0, 500),
      source,
      imageUrl: extractRssImage(block, url),
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

    const imageUrl = extractOgImage(html, finalUrl);
    return { text, finalUrl, notes, imageUrl };
  } catch (e) {
    notes.push(`article fetch failed: ${e.message}`);
    return { text: "", finalUrl: url, notes, imageUrl: null };
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

const TOKEN_STOP = new Set([
  "этот", "этого", "после", "перед", "через", "также", "более", "между", "когда",
  "чтобы", "только", "может", "будет", "были", "своей", "своих", "своём", "своего",
  "своим", "своими", "или", "для", "при", "под", "над", "без", "что", "как", "это",
  "его", "её", "их", "она", "они", "был", "была", "было", "летняя", "летний",
  "летних", "году", "года", "лет", "the", "and", "for", "with", "from", "that",
  "this", "are", "was", "were", "сообщает", "заявил", "заявила", "рассказал",
  "стало", "известно", "получила", "получил", "дали",
]);

/** Crude RU/EN stem: cut long words so пенсионерке ≈ пенсионерка, заказала ≈ заказ. */
function stemToken(w) {
  if (w.length <= 5) return w;
  return w.slice(0, 5);
}

function textTokens(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !TOKEN_STOP.has(w))
    .map(stemToken);
}

function titleTokens(title) {
  return textTokens(title);
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
  if (/lenta\.ru|ria\.ru|rbc\.ru|bbc\.|nytimes\.|guardian\.|interfax|kommersant|tass|meduza/.test(host))
    score += 4;
  if (QUIRK_HOST_RE.test(host)) score += 6;
  if (/habr\.com|theverge\.com/.test(host) && /релиз|обновлен|патч|версия/i.test(t)) score -= 3;
  return score;
}

/** Heavy / dull topics — not for evening «абсурд дня». */
const EVENING_HARD_SKIP_RE =
  /санкц|выборы|президент|правительств|госдум|сенат|конгресс|парламент|трамп|путин|байден|нато|мид\b|дипломат|законпроект|депутат|министр|минпром|минвест|минюст|кремл|белый дом|мобилиз|израил|хамас|орган(ы|ов)?\b|донор|трансплант|пересадк|инфаркт|онколог|рак\b|погиб|убит|теракт|расстрел|катастроф|землетряс|ураган|наводнен|газпром|хранилищ|инфляц|ликвидн|госконтракт|госзакуп|мигрант|нежелательн|дериватив|заблокированн|умерл|умерла|\bумер\b|эвтанази|суицид|похорон/i;

/** Signals that a story is absurd / funny / delightfully weird / a quirky sensation. */
const ABSURD_RE =
  /абсурд|курьёз|курьез|смешн|забавн|необычн|странн|сенсац|розыгрыш|опечатка|перепутал|вместо\s|сбежал|зоопарк|в квартире|пенсионерк|крокодил|удав|кот[аыу]|собак|попуга|хомяк|капибар|енот|жираф|слон|обезьян|пингвин|утка|белка|медвед(?!ев)|голубь|таракан|хомяч|хорьк|голый|трусах|блогер|лерчек|титок|\bмем\b|rm\s*-rf|удалила данные|nintendo|mamma mia|кофе натощак|утренней привычк|каникул|вирусн(ых|ой)?\s+игр|суд обязал|роскошн\w*\s+автомобил|автомобил\w*\s+блогер|claude|chatgpt|взломал.*ии|ии.*взлом|антроп|нашли.*в\s|заблудил|потерял.*наш[её]л|ошибк[аиу].*ии|ии.*ошибк|вместо резерв|миллиард.*прокат|рекорд.*ягод|ежевик|обнаруж|впервые|загад|динозавр|окамен|экзопланет|марсиан|черв[яьи]|бактер|гриб|кит\b|дельфин|осьминог|кондиционер|пепелищ|глюк|баг\b|лифт|сосед|свадьб|штраф за|запретили|разреш(или|ить).*в\s|нарисовал|тату|голышом|в трусах|забыл.*дома|перепутал.*рейс|сел не в тот|weird|bizarre|odd\b|strange|curious/i;

/** Soft science/tech novelty cues for quirk hosts without slapstick keywords. */
const QUIRK_SOFT_RE =
  /обнаруж|впервые|необыч|странн|загад|рекорд|ошибк|вместо|глюк|баг\b|взлом|утечк|динозавр|окамен|экзопланет|марс|лун[аые]|черв|бактер|гриб|кит\b|дельфин|осьминог|курьёз|забавн|robot|ai\b|llm|chatgpt|claude|glitch|bug\b|weird|bizarre/i;

/** Majority Cyrillic letters → treat as Russian copy. */
export function looksRussian(text) {
  const s = String(text || "");
  const letters = s.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, "");
  if (letters.length < 10) return false;
  const cyr = (s.match(/[а-яА-ЯёЁ]/g) || []).length;
  return cyr / letters.length >= 0.55;
}

/** Repetitive wire templates that look «hot» but are the same story every hour. */
const REPETITIVE_TOPIC_RE =
  /аэропорт\w*.{0,40}ограничен|ограничен\w*.{0,40}аэропорт|временн\w*\s+ограничен\w*.{0,30}пол[её]т|пол[её]т\w*.{0,30}временн\w*\s+ограничен|сняли временн\w*\s+ограничен\w*.{0,30}аэропорт|ввели временн\w*\s+ограничен\w*.{0,30}аэропорт/i;

function topicFingerprint(title, summary = "") {
  const t = `${title} ${summary}`;
  if (REPETITIVE_TOPIC_RE.test(t) || (/аэропорт/i.test(t) && /ограничен/i.test(t))) {
    return "topic:airport-restrictions";
  }
  if (/санкц/i.test(t) && /(росси|против рф|против россии)/i.test(t)) {
    return "topic:sanctions-russia";
  }
  return null;
}

/** Stems too common across unrelated tech/wire copy — ignore in body similarity. */
const GENERIC_STEMS = new Set([
  "openai", "chatg", "claude", "googl", "micros", "yandex", "apple", "tesla",
  "антро", "данны", "польз", "компан", "серви", "сайт", "прило", "новост",
  "сообщ", "техно", "цифро", "интер", "систем", "верси", "обнов", "запус",
  "предс", "разраб", "инжен", "учен", "иссле", "резул", "пробле", "вопрос",
  "оказа", "получ", "сдела", "хотет", "может", "нужно", "сейча", "сегод",
  "москв", "росси", "стран", "город", "людей", "человек", "время", "после",
  "перед", "также", "котот", "котор", "своем", "своих", "своей", "своего",
  "будет", "были", "было", "есть", "этот", "этого", "очень", "более", "между",
  "через", "тольк", "чтобы", "когда", "если", "или", "при", "под", "над",
  "агент", "модел", "нейрон", "искус", "алгор",
]);

function contentTokens(text) {
  return textTokens(text).filter((t) => !GENERIC_STEMS.has(t));
}

function uniqueOverlap(a, b) {
  const setB = new Set(b);
  const hit = new Set();
  for (const w of a) if (setB.has(w)) hit.add(w);
  return hit.size;
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/**
 * True if candidate is too close to something already stored recently.
 * Title stems catch wire rewrites; body uses content tokens + Jaccard so
 * shared «OpenAI/данные» boilerplate does not kill unrelated stories.
 */
export function findSimilarRecent(
  item,
  recentItems,
  { minTitleOverlap = 3, minBodyJaccard = 0.22, minBodyOverlap = 14 } = {},
) {
  const title = item.title || "";
  const body = `${item.articleText || ""} ${item.summary || ""}`.trim();
  const fp = topicFingerprint(title, body || item.summary || "");
  const titleToks = textTokens(title);
  const titleContent = contentTokens(title);
  const bodyContent = contentTokens(body.slice(0, 3500));

  for (const prev of recentItems || []) {
    const prevTitle = prev.title || "";
    const prevBody = String(prev.summary || prev.articleText || "");
    const prevFp = topicFingerprint(prevTitle, prevBody);
    if (fp && prevFp && fp === prevFp) {
      return { reason: `topic ${fp}`, match: prev };
    }

    const prevTitleToks = textTokens(prevTitle);
    const titleOverlap = uniqueOverlap(titleToks, prevTitleToks);
    if (titleOverlap >= minTitleOverlap) {
      return { reason: `title overlap=${titleOverlap}`, match: prev };
    }

    const prevTitleContent = contentTokens(prevTitle);
    const prevBodyContent = contentTokens(prevBody.slice(0, 3500));

    // Title content words appearing in the other story's body (same event, different headline).
    if (titleContent.length >= 3 && prevBodyContent.length >= 8) {
      const titleInPrev = uniqueOverlap(titleContent, prevBodyContent);
      if (
        titleInPrev >= minTitleOverlap &&
        titleInPrev / titleContent.length >= 0.55
      ) {
        return { reason: `title∈body overlap=${titleInPrev}`, match: prev };
      }
    }
    if (prevTitleContent.length >= 3 && bodyContent.length >= 8) {
      const prevInBody = uniqueOverlap(prevTitleContent, bodyContent);
      if (
        prevInBody >= minTitleOverlap &&
        prevInBody / prevTitleContent.length >= 0.55
      ) {
        return { reason: `prevTitle∈body overlap=${prevInBody}`, match: prev };
      }
    }

    // Body↔body: require both absolute overlap and Jaccard on content tokens.
    if (bodyContent.length >= 12 && prevBodyContent.length >= 12) {
      const bodyOverlap = uniqueOverlap(bodyContent, prevBodyContent);
      const jac = jaccard(bodyContent, prevBodyContent);
      if (bodyOverlap >= minBodyOverlap && jac >= minBodyJaccard) {
        return {
          reason: `body overlap=${bodyOverlap} jaccard=${jac.toFixed(2)}`,
          match: prev,
        };
      }
    }
  }
  return null;
}

function absurdScore(item) {
  const t = `${item.title} ${item.summary || ""} ${item.articleText || ""}`;
  const host = hostOf(item.resolvedUrl || item.url);
  const quirkHost = QUIRK_HOST_RE.test(host);
  if (EVENING_HARD_SKIP_RE.test(t) || SKIP_RE.test(t)) return -999;
  if (/news\.google\.com/i.test(item.url)) return -40;
  // Same wire blurb every hour (airports closed/opened) — never «абсурд дня».
  if (topicFingerprint(item.title, item.summary) === "topic:airport-restrictions") {
    return -80;
  }

  const hasAbsurd = ABSURD_RE.test(t);
  const softQuirk = quirkHost && QUIRK_SOFT_RE.test(t);

  // Gate: without an absurd/funny signal, keep score ≤0 so evening/hourly won't pick it.
  if (!hasAbsurd && !softQuirk) {
    return Math.min(item.clusterSize || 1, 3) - 5;
  }

  let s = softQuirk && !hasAbsurd ? 48 : 68;
  s += Math.min(item.clusterSize || 1, 6) * 4;
  s += Math.max(0, item.score || 0) * 0.1;
  if (quirkHost) s += 22;
  if (item.articleText && item.articleText.length > 200) s += 8;

  if (/крокодил|удав|зоопарк|сбежал|в квартире|пенсионерк|кондиционер|пепелищ|таракан|голубь/i.test(t))
    s += 50;
  if (/перепутал|опечатка|вместо\s|rm\s*-rf|удалила данные|сел не в тот|забыл.*дома/i.test(t))
    s += 45;
  if (/блогер|лерчек|\bмем\b|титок|курьёз|забавн|смешн|абсурд|необычн|странн|сенсац|weird|bizarre/i.test(t))
    s += 32;
  if (/nintendo|mamma mia|кофе|каникул|привычк|roblox|claude|chatgpt|atlas obscura|лифт|сосед|свадьб/i.test(t))
    s += 20;
  if (/динозавр|окамен|экзопланет|марсиан|осьминог|дельфин/i.test(t)) s += 18;
  if (/habr\.com|theverge\.com|arstechnica|ixbt\.com|3dnews/i.test(host) && /удал|ошиб|слома|вместо|rm|glitch|bug|глюк/i.test(t))
    s += 14;
  return s;
}

/** Rank RSS items; excludeUrls skips already-seen / already-stored links. */
export async function rankNews({
  excludeUrls = [],
  russianOnly = false,
  feeds = null,
} = {}) {
  const excluded = new Set(excludeUrls);
  const feedList = feeds || FEEDS;
  const all = [];
  for (const feed of feedList) {
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
    .filter((i) => !SKIP_RE.test(`${i.title} ${i.summary}`))
    .filter((i) => !russianOnly || looksRussian(`${i.title} ${i.summary}`));

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

/**
 * Hourly cron: pick the funniest / most absurd / quirky Russian story that is
 * NOT similar to anything stored in the last 24h.
 * Fetches article bodies for top candidates so scoring/verdict see more than titles.
 * Returns null when nothing suitable — caller must skip DB write / vote.
 */
export async function pickHourlyAbsurdNews({
  excludeUrls = [],
  recentItems = [],
  enrichTop = 8,
} = {}) {
  const ranked = await rankNews({
    excludeUrls,
    russianOnly: true,
    feeds: FEEDS_HOURLY,
  });
  const byAbsurd = [...ranked]
    .filter((i) => (i.absurdScore ?? absurdScore(i)) > 0)
    .sort((a, b) => (b.absurdScore ?? 0) - (a.absurdScore ?? 0));

  const shortlist = byAbsurd.slice(0, Math.max(1, enrichTop));
  const enriched = [];
  for (const cand of shortlist) {
    // Cheap title-only pass before fetching the article.
    const earlyDup = findSimilarRecent(cand, recentItems);
    if (earlyDup) {
      console.log(
        `skip similar (${earlyDup.reason}) :: ${cand.title} ≈ ${earlyDup.match?.title || "?"}`,
      );
      continue;
    }
    try {
      const fetched = await fetchArticleBody(cand.url, { maxChars: 5000 });
      if (fetched.notes?.length) {
        console.warn("hourly article:", fetched.notes.join("; "));
      }
      if (fetched.text && fetched.text.length > 80) {
        cand.articleText = fetched.text;
        // Prefer body for scoring; keep a short summary for DB/display.
        cand.summary = fetched.text.slice(0, 500);
      }
      if (fetched.finalUrl && !/news\.google\.com/i.test(fetched.finalUrl)) {
        cand.resolvedUrl = fetched.finalUrl;
        cand.url = fetched.finalUrl;
      }
      if (fetched.imageUrl) cand.imageUrl = fetched.imageUrl;
      // Drop if article body is clearly not Russian (EN wire via RU feed title).
      if (
        cand.articleText &&
        !looksRussian(`${cand.title} ${cand.articleText.slice(0, 800)}`)
      ) {
        console.log(`skip non-russian body :: ${cand.title}`);
        continue;
      }
      // Always re-check with article body vs recent summaries (wire rewrites).
      const bodyDup = findSimilarRecent(cand, recentItems);
      if (bodyDup) {
        console.log(
          `skip similar after body (${bodyDup.reason}) :: ${cand.title} ≈ ${bodyDup.match?.title || "?"}`,
        );
        continue;
      }
      cand.absurdScore = absurdScore(cand);
      if (cand.absurdScore <= 0) {
        console.log(
          `skip after body (absurd=${cand.absurdScore}) :: ${cand.title}`,
        );
        continue;
      }
      enriched.push(cand);
    } catch (e) {
      console.warn(`hourly enrich fail: ${e.message} :: ${cand.title}`);
      // Title-only fallback still allowed if it already looked absurd.
      if ((cand.absurdScore ?? 0) > 0) {
        const fallbackDup = findSimilarRecent(cand, recentItems);
        if (fallbackDup) {
          console.log(
            `skip similar fallback (${fallbackDup.reason}) :: ${cand.title}`,
          );
          continue;
        }
        enriched.push(cand);
      }
    }
  }

  enriched.sort((a, b) => (b.absurdScore ?? 0) - (a.absurdScore ?? 0));
  const top = enriched[0];
  if (top) {
    console.log(
      `hourly absurd=${top.absurdScore} score=${top.score} cluster=${top.clusterSize} body=${(top.articleText || "").length} :: ${top.title}`,
    );
    return top;
  }

  console.log(
    `hourly: no absurd/unique RU candidate (shortlist=${shortlist.length}, ranked=${ranked.length})`,
  );
  return null;
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
