#!/usr/bin/env node
/**
 * Daily pizdato.net channel post: live vote stats + "мудрость дня".
 * Uses the existing mcp-telegram StoreSession (user account).
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { channelPeer, loadPosterEnv } from "./lib/env.js";
import { sendChannel } from "./lib/telegram.js";

const STATS_URL = process.env.PIZDATO_STATS_URL || "https://pizdato.net/api/stats";

const WISDOMS = [
  "Не всё то пиздато, что блестит.",
  "Тише едешь — пиздатее будет.",
  "Семь раз отмерь — один раз сделай пиздато.",
  "Хуёво сегодня — пиздато завтра.",
  "Без труда не вытащишь и рыбку из пруда, а пиздато — тем более.",
  "Не откладывай на завтра то, что можно сделать пиздато сегодня.",
  "Лучше синица в руках, чем хуёво в небесах.",
  "Кто рано встаёт — тому пиздато даёт.",
  "Скажи мне, за что голосуешь, и я скажу, кто ты.",
  "На вкус и цвет товарищей нет, зато есть пиздато и хуёво.",
  "Один в поле не воин, но один клик — уже голос.",
  "Не рой другому яму — сделай пиздато себе.",
  "Век живи — век голосуй.",
  "Что посеешь, то и пожнёшь: хуёво посеял — хуёво собрал.",
  "Утро вечера мудренее, а статистика — ещё мудренее.",
  "Не имей сто рублей, а имей сто голосов за пиздато.",
  "Работа не волк — в лес не убежит, а пиздато само не случится.",
  "Голос правду говорит.",
  "Маленький шаг для человека — большой клик для пиздато.",
  "Если закрыть глаза, хуёво никуда не денется.",
  "Дружба дружбой, а голосование врозь.",
  "Не всё то хуёво, что кажется хуёво.",
  "Сделай пиздато — и пусть весь мир подождёт.",
  "Попытка не пытка, особенно если кнопка рядом.",
  "Чем дальше в лес, тем больше пиздато… или хуёво. Смотри статы.",
  "На чужой каравай рот не разевай — голосуй за свой.",
  "Тишина — золото, а пиздато — платина.",
  "Кто не рискует, тот не пьёт шампанское и не жмёт «пиздато».",
  "Всё гениальное просто. Особенно две кнопки.",
  "Будь собой. Остальные роли уже заняты хуёво.",
];

function dayIndex(d = new Date()) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((now - start) / 86400000);
}

function wisdomForToday() {
  return WISDOMS[dayIndex() % WISDOMS.length];
}

function formatRuDate(d = new Date()) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function bar(part, total, width = 12) {
  if (total <= 0) return "░".repeat(width);
  const filled = Math.round((part / total) * width);
  return "█".repeat(filled) + "░".repeat(Math.max(0, width - filled));
}

async function fetchStats() {
  const res = await fetch(STATS_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`stats HTTP ${res.status}`);
  return res.json();
}

function buildMessage(stats) {
  const p = Number(stats.pizdato) || 0;
  const h = Number(stats.huyevo) || 0;
  const t = Number(stats.total) || p + h;
  const pp = t > 0 ? Math.round((p / t) * 100) : 0;
  const hp = t > 0 ? Math.round((h / t) * 100) : 0;
  const wisdom = wisdomForToday();

  return [
    `📊 Статы pizdato.net — ${formatRuDate()}`,
    "",
    `пиздато  ${bar(p, t)}  ${p} (${pp}%)`,
    `хуёво    ${bar(h, t)}  ${h} (${hp}%)`,
    `всего: ${t}`,
    "",
    `🧠 Мудрость дня`,
    `«${wisdom}»`,
    "",
    "Мир ждёт твоего голоса. Остальное — уже легенда:",
    "https://pizdato.net",
  ].join("\n");
}

async function main() {
  loadPosterEnv();
  const stats = await fetchStats();
  const text = buildMessage(stats);
  await sendChannel(text, { linkPreview: false });
  console.log(`posted to ${channelPeer()}`);
  console.log(text);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
