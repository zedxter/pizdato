#!/usr/bin/env node
/**
 * Daily owner DM: traffic / sessions / human vs news votes for a calendar day.
 *
 *   node report-daily.mjs              # yesterday (default), DM owner
 *   node report-daily.mjs --today      # today so far
 *   node report-daily.mjs --dry-run    # print only, no Telegram
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSql } from "./lib/db.js";
import { loadPosterEnv } from "./lib/env.js";
import { notifyOwner } from "./lib/telegram.js";

const ACCESS_LOG =
  process.env.PIZDATO_ACCESS_LOG || "/var/log/caddy/pizdato-access.log";

function dayBounds(which) {
  // SQLite stores UTC; local day in Europe/Berlin ≈ server localtime.
  if (which === "today") {
    return {
      label: "сегодня",
      sqlDay: "date('now', 'localtime')",
      access: "today",
    };
  }
  return {
    label: "вчера",
    sqlDay: "date('now', 'localtime', '-1 day')",
    access: "yesterday",
  };
}

function scalar(sql) {
  const rows = runSql(sql, { json: true });
  if (!rows.length) return 0;
  const v = Object.values(rows[0])[0];
  return Number(v) || 0;
}

function collectDbStats(sqlDay) {
  const sessions = scalar(
    `SELECT COUNT(*) AS n FROM sessions WHERE date(created_at, 'localtime') = ${sqlDay};`,
  );
  const sessionsVoted = scalar(
    `SELECT COUNT(*) AS n FROM sessions s
     WHERE date(s.created_at, 'localtime') = ${sqlDay}
       AND EXISTS (SELECT 1 FROM votes v WHERE v.voter_id = s.voter_id);`,
  );
  const humanVotes = scalar(
    `SELECT COUNT(*) AS n FROM votes
     WHERE date(created_at, 'localtime') = ${sqlDay}
       AND voter_id NOT LIKE 'news:%';`,
  );
  const newsVotes = scalar(
    `SELECT COUNT(*) AS n FROM votes
     WHERE date(created_at, 'localtime') = ${sqlDay}
       AND voter_id LIKE 'news:%';`,
  );
  const humanP = scalar(
    `SELECT COUNT(*) AS n FROM votes
     WHERE date(created_at, 'localtime') = ${sqlDay}
       AND voter_id NOT LIKE 'news:%' AND choice = 'pizdato';`,
  );
  const humanH = scalar(
    `SELECT COUNT(*) AS n FROM votes
     WHERE date(created_at, 'localtime') = ${sqlDay}
       AND voter_id NOT LIKE 'news:%' AND choice = 'huyevo';`,
  );
  const newsP = scalar(
    `SELECT COUNT(*) AS n FROM votes
     WHERE date(created_at, 'localtime') = ${sqlDay}
       AND voter_id LIKE 'news:%' AND choice = 'pizdato';`,
  );
  const newsH = scalar(
    `SELECT COUNT(*) AS n FROM votes
     WHERE date(created_at, 'localtime') = ${sqlDay}
       AND voter_id LIKE 'news:%' AND choice = 'huyevo';`,
  );
  const newsItems = scalar(
    `SELECT COUNT(*) AS n FROM news_items
     WHERE date(created_at, 'localtime') = ${sqlDay};`,
  );

  const dayLabel = runSql(`SELECT ${sqlDay} AS d;`, { json: true })[0]?.d || "?";

  return {
    dayLabel,
    sessions,
    sessionsVoted,
    sessionsNoVote: Math.max(0, sessions - sessionsVoted),
    humanVotes,
    humanP,
    humanH,
    newsVotes,
    newsP,
    newsH,
    newsItems,
  };
}

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
  try {
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
  let lines = 0;

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    const ts = o.ts;
    if (ts == null) continue;
    const day = fmt.format(new Date(Number(ts) * 1000));
    if (day !== targetDay) continue;
    lines += 1;
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

  return {
    ok: true,
    day: targetDay,
    lines,
    uniqueIps: ips.size,
    uniqueIpsNonBot: ipsHuman.size,
    homeGets,
    votePostIps: voteIps.size,
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
  } else if (access && !access.ok) {
    lines.push("", `Access-log: недоступен (${access.error})`);
  }

  return lines.join("\n");
}

async function main() {
  loadPosterEnv();
  const today = process.argv.includes("--today");
  const dry = process.argv.includes("--dry-run");
  const { label, sqlDay, access: accessWhich } = dayBounds(today ? "today" : "yesterday");

  const db = collectDbStats(sqlDay);
  const access = collectAccessStats(accessWhich);
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
