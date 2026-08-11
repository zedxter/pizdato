#!/usr/bin/env node
/**
 * Daily owner DM: traffic / sessions / human vs news votes for a calendar day.
 *
 *   node report-daily.mjs              # yesterday (default), DM owner
 *   node report-daily.mjs --today      # today so far
 *   node report-daily.mjs --dry-run    # print only, no Telegram
 */
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dayTrafficStats } from "./lib/db.js";
import { loadPosterEnv } from "./lib/env.js";
import { notifyOwner } from "./lib/telegram.js";

const ACCESS_LOG =
  process.env.PIZDATO_ACCESS_LOG || "/var/log/caddy/pizdato-access.log";

function isBotUa(ua) {
  const u = String(ua || "").toLowerCase();
  return [
    "bot",
    "crawl",
    "spider",
    "curl/",
    "wget",
    "python-requests",
    "httpie",
    "monitoring",
    "uptime",
    "prometheus",
    "health",
    "scan",
  ].some((k) => u.includes(k));
}

function collectAccessStats(which) {
  let raw;
  let st;
  try {
    st = statSync(ACCESS_LOG);
    raw = readFileSync(ACCESS_LOG, "utf8");
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const targetDay =
    which === "today"
      ? fmt.format(now)
      : fmt.format(new Date(now.getTime() - 86400000));

  const ips = new Set();
  const ipsHuman = new Set();
  const voteIps = new Set();
  let homeGets = 0;
  let matchedLines = 0;
  let parseableLines = 0;

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    parseableLines += 1;
    const ts = o.ts;
    if (ts == null) continue;
    const day = fmt.format(new Date(Number(ts) * 1000));
    if (day !== targetDay) continue;
    matchedLines += 1;
    const req = o.request || {};
    const ip = req.client_ip || req.remote_ip;
    if (!ip) continue;
    ips.add(ip);
    const headers = req.headers || {};
    const uaList = headers["User-Agent"] || headers["user-agent"] || [];
    const ua = Array.isArray(uaList) ? uaList[0] : uaList;
    if (!isBotUa(ua)) ipsHuman.add(ip);
    const uri = String(req.uri || "").split("?")[0];
    const method = req.method || "";
    if (method === "GET" && (uri === "/" || uri === "")) homeGets += 1;
    if (method === "POST" && uri.startsWith("/api/vote")) voteIps.add(ip);
  }

  const ageHours = (Date.now() - st.mtimeMs) / 3600000;
  const stale =
    st.size === 0 ||
    parseableLines === 0 ||
    (matchedLines === 0 && ageHours > 36 && which === "yesterday");

  return {
    ok: true,
    day: targetDay,
    uniqueIps: ips.size,
    uniqueIpsNonBot: ipsHuman.size,
    homeGets,
    votePostIps: voteIps.size,
    matchedLines,
    parseableLines,
    fileBytes: st.size,
    stale,
    staleHint:
      st.size === 0
        ? "файл access-log пуст — Caddy, скорее всего, не пишет в него"
        : parseableLines === 0
          ? "в access-log нет JSON-строк"
          : matchedLines === 0
            ? "за выбранный день в access-log нет строк (лог мог не писаться)"
            : null,
  };
}

function buildReport({ db, access, label }) {
  const lines = [
    `📈 Трафик pizdato.net — ${label} (${db.dayLabel})`,
    "",
    "Визиты / сессии",
    `• новых сессий: ${db.sessions}`,
    `• из них с голосом (когда‑либо): ${db.sessionsVoted}`,
    `• без голоса: ${db.sessionsNoVote}`,
    "",
    "Голоса",
    `• люди: ${db.humanVotes} (👍 ${db.humanP} / 👎 ${db.humanH})`,
    `• новости: ${db.newsVotes} (👍 ${db.newsP} / 👎 ${db.newsH}), записей news_items: ${db.newsItems}`,
  ];

  if (access?.ok) {
    lines.push(
      "",
      "Access-log",
      `• уникальных IP: ${access.uniqueIps} (без явных bot/curl UA: ${access.uniqueIpsNonBot})`,
      `• GET /: ${access.homeGets}`,
      `• IP с POST /api/vote: ${access.votePostIps}`,
    );
    if (access.stale || (access.matchedLines === 0 && db.sessions > 0)) {
      lines.push(
        `⚠️ ${access.staleHint || "access-log без записей за день при ненулевых сессиях в БД"}`,
      );
    }
  } else if (access && !access.ok) {
    lines.push("", `Access-log: недоступен (${access.error})`);
  }

  return lines.join("\n");
}

async function main() {
  loadPosterEnv();
  const today = process.argv.includes("--today");
  const dry = process.argv.includes("--dry-run");
  const which = today ? "today" : "yesterday";
  const label = today ? "сегодня" : "вчера";

  const db = dayTrafficStats(which);
  const access = collectAccessStats(which);
  const text = buildReport({ db, access, label });

  console.log(text);
  if (dry) return;

  await notifyOwner(text, "📈 daily traffic");
  console.log("sent to owner");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
