import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { sourceFooter, telegramForSource, fetchArticleBody } from "./news.js";
import { sessionConfig } from "./telegram.js";

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

function runCursorAgent(prompt, { mode = "ask" } = {}) {
  const { sessionCwd } = sessionConfig();
  const bin = process.env.CURSOR_AGENT_BIN || `${homedir()}/.local/bin/cursor-agent`;
  const args = ["-p", "--output-format", "json", "--trust", "--workspace", sessionCwd];
  // ask-mode sometimes returns empty result for strict JSON tasks; callers can disable it.
  if (mode) {
    args.push("--mode", mode);
  }
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
      const raw = out.trim();
      let text = raw;
      // Prefer structured JSON result; fall back to raw stdout.
      if (raw.startsWith("{")) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.is_error) {
            reject(
              new Error(
                `cursor-agent error: ${String(parsed.result || parsed.error || "unknown").slice(0, 400)}`,
              ),
            );
            return;
          }
          if (typeof parsed?.result === "string") text = parsed.result.trim();
        } catch {
          // keep raw text
        }
      }
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

export async function generatePost(item) {
  const notes = [];
  const useCursor = process.env.PIZDATO_USE_CURSOR_AGENT !== "0";

  if (useCursor) {
    try {
      console.log("generating with cursor-agent...");
      // ask-mode often returns empty for long creative posts; default agent mode works.
      const raw = await runCursorAgent(buildPrompt(item), { mode: null });
      const cleaned = sanitizePost(raw);
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
      const cleaned = sanitizePost(api);
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
- «хуёво» — если новость про плохое для людей/страны/общества: санкции, давление, катастрофы, смерти, войны, кризисы, репрессии, аварии, обманы, унижения. Если одной стране или людям от события хуже — это хуёво, даже если «кто-то другой рад» или новость «горячая».
- «пиздато» — если суть скорее хорошая, удачная, смешная, облегчающая жизнь, победа без чужой беды, крутой прогресс без жертв.
- Не путай «важная/обсуждаемая» с «пиздато». Горячий негатив = хуёво.
- Ирония в reason ок, морализаторство нет.

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
    const reason = String(obj.reason || "").trim().slice(0, 500);
    if (!verdict || !reason) return null;
    return { verdict, reason };
  } catch {
    return null;
  }
}

function heuristicVerdict(item) {
  const t = `${item.title} ${item.summary || ""} ${item.articleText || ""}`;
  const bad =
    /санкц|катастроф|авария|погибли|убит|скандал|штраф|банкрот|обвал|кризис|арест|приговор|утечк|взлом|хакер|давлени|репресс|войн|обстрел|депортац|пострад|жертв|трагед|голод|бедств/i.test(
      t,
    );
  return {
    verdict: bad ? "huyevo" : "pizdato",
    reason: bad
      ? "По сути события людям/стране от этого хуже — засчитываем как хуёво."
      : "По тексту не видно чужой беды — засчитываем как пиздато.",
  };
}

async function apiLlmVerdict(item) {
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
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            'Отвечай только JSON: {"verdict":"pizdato"|"huyevo","reason":"..."}. Плохие события для людей/стран = huyevo.',
        },
        { role: "user", content: buildVerdictPrompt(item) },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

/** Decide пиздато/хуёво for hourly news cron. Fetches article body first. */
export async function generateVerdict(item) {
  const notes = [];
  const enriched = { ...item };

  if (!enriched.articleText) {
    console.log("fetching article body...");
    const fetched = await fetchArticleBody(enriched.url);
    notes.push(...fetched.notes);
    enriched.articleText = fetched.text;
    if (fetched.finalUrl && fetched.finalUrl !== enriched.url) {
      enriched.resolvedUrl = fetched.finalUrl;
    }
    console.log(
      `article chars=${(enriched.articleText || "").length} final=${fetched.finalUrl || enriched.url}`,
    );
  }

  const useCursor = process.env.PIZDATO_USE_CURSOR_AGENT !== "0";

  if (useCursor) {
    try {
      console.log("verdict with cursor-agent...");
      // ask-mode often returns empty for JSON-only verdicts; default agent mode works.
      const raw = await runCursorAgent(buildVerdictPrompt(enriched), { mode: null });
      const parsed = parseVerdict(raw);
      if (parsed) return { ...parsed, notes, item: enriched };
      notes.push("cursor-agent verdict JSON parse failed");
    } catch (e) {
      notes.push(`cursor-agent failed: ${e.message}`);
      console.warn("cursor-agent verdict failed:", e.message);
    }
  }

  try {
    const api = await apiLlmVerdict(enriched);
    const parsed = parseVerdict(api);
    if (parsed) return { ...parsed, notes, item: enriched };
    if (api) notes.push("API LLM verdict JSON parse failed");
  } catch (e) {
    notes.push(`API LLM failed: ${e.message}`);
    console.warn("API LLM verdict failed:", e.message);
  }

  const fallback = heuristicVerdict(enriched);
  notes.push("использована эвристика вердикта");
  return { ...fallback, notes, item: enriched };
}
