import { openRouterText } from "./openrouter.js";
import { sourceFooter, telegramForSource, fetchArticleBody } from "./news.js";

const CTA = [
  "Мир ждёт твоего голоса. Остальное — уже легенда:",
  "https://pizdato.net",
];

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

export function templatePost(item) {
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
    ...CTA,
    "",
    sourceFooter(item),
  ].join("\n");
}

export function buildPrompt(item) {
  const tg = item.telegram || telegramForSource(item.url);
  const sourceLines = [`Источник: ${item.url}`];
  if (tg) sourceLines.push(`Telegram источника: ${tg}`);
  const heat =
    item.absurdScore != null
      ? `Это самая абсурдная / смешная / курьёзная новость дня (absurdScore=${item.absurdScore}). Подавай как вечерний разбор абсурда, не как сводку политики.`
      : item.clusterSize > 1
        ? `Новость сейчас горячая: похожие заголовки встретились примерно в ${item.clusterSize} лентах.`
        : "Новость из топа/агрегатора — считай её обсуждаемой.";

  return `Ты автор Telegram-канала pizdato.net. Напиши вечерний пост на русском по АБСУРДНОЙ / СМЕШНОЙ новости дня ниже.

${heat}

ВАЖНО:
- Используй ТОЛЬКО заголовок и текст из этого сообщения. Не пытайся открывать URL, делать Fetch/WebSearch или читать страницы.
- Верни ТОЛЬКО финальный текст поста для канала. Никаких служебных фраз, рассуждений о инструментах, «попробую иначе», «fetch отклонили», markdown.
- Тон: лёгкий, ироничный, с кайфом от абсурда. Не морализируй и не превращай в траурный репортаж.

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
${CTA.join("\n")}
7) В конце РОВНО эти строки источника (не меняй URL):
${sourceLines.join("\n")}

Заголовок: ${item.title}
Кратко: ${item.summary}`;
}

/** Strip agent tool narration; keep only channel-ready copy. */
export function sanitizePost(raw) {
  let text = String(raw || "").trim();
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
    if (
      looksLikeTechChatter(line) &&
      !line.includes("pizdato.net") &&
      !/^Источник:/i.test(line)
    ) {
      junk.push(line.trim());
      continue;
    }
    cleaned.push(line);
  }

  text = cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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

async function apiLlmPost(item) {
  return openRouterText({
    temperature: 0.8,
    system: "Ты пишешь короткие колонки для канала pizdato.net.",
    prompt: buildPrompt(item),
  });
}

export async function generatePost(item) {
  const notes = [];
  try {
    console.log("generating with OpenRouter...");
    const raw = await apiLlmPost(item);
    const cleaned = sanitizePost(raw);
    // Generated junk is not logged because it may echo private request data.
    if (cleaned.junk) notes.push("OpenRouter service chatter removed");
    if (cleaned.ok) return { text: cleaned.text, notes };
    notes.push("OpenRouter returned an invalid post structure");
  } catch (e) {
    notes.push(`OpenRouter failed: ${e.message}`);
    console.warn("OpenRouter failed:", e.message);
  }

  notes.push("использован локальный шаблон поста");
  return { text: templatePost(item), notes };
}

export function buildVerdictPrompt(item) {
  const body =
    item.articleText && String(item.articleText).trim()
      ? String(item.articleText).trim()
      : "";
  const bodyBlock = body
    ? `Текст статьи (уже скачан кроном, не открывай URL):\n"""\n${body}\n"""`
    : "Текст статьи скачать не удалось — опирайся на заголовок и краткое описание.";

  return `Ты решаешь для внутреннего учёта pizdato.net: эта новость «пиздато» или «хуёво».

Критерий вердикта (важно):
- Опирайся в первую очередь на текст статьи ниже, не только на заголовок.
- «хуёво» — если людям/стране/обществу от события хуже: давление, катастрофы, смерти, войны, кризисы, репрессии, аварии, обманы, унижения. Если кому-то стало реально хуже — это хуёво, даже если новость «горячая» или «кто-то другой рад».
- «пиздато» — если суть скорее удачная, смешная, курьёзная, облегчающая жизнь, победа или забавный абсурд.
- Не путай «важная/обсуждаемая» с «пиздато». Горячий негатив = хуёво.
- Ирония в reason ок, морализаторство нет.

Как писать reason (поле «Почему» в ленте):
- 1–2 коротких предложения на русском, живо и смешно — как будто друг пересказывает новость у барной стойки.
- Цепляйся за конкретику ЭТОЙ новости (кто, что, деталь), не общие слова.
- Запрещены штампы и канцелярит: «без бед и катастроф», «без чужой беды», «засчитываем как», «по сути события», «не видно чужой беды», «облегчающая жизнь», «чистое техно-вау».
- Для «пиздато» — почему это угарно/приятно укололо мир.
- Для «хуёво» — почему это реально портит кому-то день, без траурного пафоса.

Правила ответа:
- Не открывай URL и не вызывай инструменты — текст уже дан ниже.
- Верни ТОЛЬКО один JSON-объект без markdown и без пояснений вокруг:
  {"verdict":"pizdato"|"huyevo","reason":"1–2 коротких предложения на русском"}

Заголовок: ${item.title}
Кратко: ${item.summary || "—"}
URL: ${item.url}
${bodyBlock}`;
}

export function parseVerdict(raw) {
  const text = String(raw || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    const verdict = obj.verdict === "pizdato" || obj.verdict === "huyevo" ? obj.verdict : null;
    if (typeof obj.reason !== "string") return null;
    const reason = obj.reason.trim().slice(0, 500);
    if (!verdict || !reason) return null;
    return { verdict, reason };
  } catch {
    return null;
  }
}

function heuristicVerdict(item) {
  const t = `${item.title} ${item.summary || ""} ${item.articleText || ""}`;
  const bad =
    /санкц|катастроф|авария|погибли|убит|скандал|штраф|банкрот|обвал|кризис|арест|приговор|утечк|взлом|хакер|давлени|репресс|войн|обстрел|депортац|пострад|жертв|трагед|голод|бедств|землетряс|ураган|наводнен|пожар/i.test(
      t,
    );
  const title = String(item.title || "").trim() || "эта новость";
  return {
    verdict: bad ? "huyevo" : "pizdato",
    reason: bad
      ? `«${title.slice(0, 80)}» — день явно не для шампанского.`
      : `«${title.slice(0, 80)}» — мир снова удивил, и это скорее в плюс.`,
  };
}

async function apiLlmVerdict(item) {
  return openRouterText({
    temperature: 0.3,
    system: 'Отвечай только JSON: {"verdict":"pizdato"|"huyevo","reason":"..."}. Плохие события для людей/стран = huyevo. Reason — короткая ирония по делу, без штампов вроде «без бед и катастроф».',
    prompt: buildVerdictPrompt(item),
  });
}

/** Decide пиздато/хуёво for hourly news cron. Fetches article body first. */
export async function generateVerdict(item) {
  const notes = [];
  const enriched = { ...item };

  if (!enriched.articleText) {
    console.log("fetching article body...");
    const fetched = await fetchArticleBody(enriched.url);
    notes.push(...fetched.notes);
    if (!fetched.ok) {
      throw new Error(
        `article URL not reachable: ${fetched.notes.join("; ") || enriched.url}`,
      );
    }
    enriched.articleText = fetched.text;
    if (fetched.finalUrl && fetched.finalUrl !== enriched.url) {
      enriched.resolvedUrl = fetched.finalUrl;
    }
    if (fetched.imageUrl && !enriched.imageUrl) {
      enriched.imageUrl = fetched.imageUrl;
    }
    console.log(
      `article chars=${(enriched.articleText || "").length} final=${fetched.finalUrl || enriched.url}`,
    );
  }

  try {
    console.log("verdict with OpenRouter...");
    const raw = await apiLlmVerdict(enriched);
    const parsed = parseVerdict(raw);
    if (parsed) return { ...parsed, notes, item: enriched };
    notes.push("OpenRouter verdict JSON parse failed");
  } catch (e) {
    notes.push(`OpenRouter failed: ${e.message}`);
    console.warn("OpenRouter verdict failed:", e.message);
  }

  const fallback = heuristicVerdict(enriched);
  notes.push("использована эвристика вердикта");
  return { ...fallback, notes, item: enriched };
}
