import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

export function dbPath() {
  return (
    process.env.PIZDATO_DB ||
    process.env.PIZDATO_VOTES_DB ||
    "/var/lib/pizdato/votes.db"
  );
}

function sqlString(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

/** Run SQL against votes.db via sqlite3 CLI (WAL-friendly busy timeout). */
export function runSql(sql, { json = false } = {}) {
  const db = dbPath();
  const args = ["-cmd", ".timeout 8000"];
  if (json) args.push("-json");
  args.push(db, sql);
  const res = spawnSync("sqlite3", args, {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(
      `sqlite3 exit ${res.status}: ${(res.stderr || res.stdout || "").trim().slice(0, 500)}`,
    );
  }
  const out = (res.stdout || "").trim();
  if (!json) return out;
  if (!out) return [];
  try {
    return JSON.parse(out);
  } catch {
    throw new Error(`sqlite3 json parse failed: ${out.slice(0, 200)}`);
  }
}

export function newsVoterId(url) {
  const hash = createHash("sha256").update(String(url)).digest("hex").slice(0, 16);
  return `news:${hash}`;
}

export function listNewsUrls({ days = 30 } = {}) {
  const rows = runSql(
    `SELECT url FROM news_items WHERE created_at >= datetime('now', '-${Number(days)} days');`,
    { json: true },
  );
  return rows.map((r) => r.url).filter(Boolean);
}

/**
 * Insert news_items row + matching votes row in one transaction.
 * Idempotent on url: returns { inserted: false } if url already exists.
 */
export function insertNewsAndVote({
  title,
  url,
  summary = "",
  source = null,
  telegram = null,
  verdict,
  reason = "",
  score = 0,
  clusterSize = 1,
  engagement = 0,
}) {
  if (verdict !== "pizdato" && verdict !== "huyevo") {
    throw new Error(`invalid verdict: ${verdict}`);
  }
  const voterId = newsVoterId(url);
  const existing = runSql(`SELECT id FROM news_items WHERE url = ${sqlString(url)} LIMIT 1;`, {
    json: true,
  });
  if (existing.length) {
    return { inserted: false, id: existing[0].id, voterId };
  }

  runSql(`
BEGIN IMMEDIATE;
INSERT INTO news_items (
  title, url, summary, source, telegram, verdict, reason,
  score, cluster_size, engagement, voter_id
) VALUES (
  ${sqlString(title)},
  ${sqlString(url)},
  ${sqlString(summary)},
  ${source == null ? "NULL" : sqlString(source)},
  ${telegram == null ? "NULL" : sqlString(telegram)},
  ${sqlString(verdict)},
  ${sqlString(reason)},
  ${Number(score) || 0},
  ${Math.max(1, Number(clusterSize) || 1)},
  ${Math.max(0, Number(engagement) || 0)},
  ${sqlString(voterId)}
);
INSERT INTO votes (choice, voter_id, ip_hash)
VALUES (${sqlString(verdict)}, ${sqlString(voterId)}, NULL);
COMMIT;
`);

  const rows = runSql(`SELECT id FROM news_items WHERE url = ${sqlString(url)} LIMIT 1;`, {
    json: true,
  });
  return { inserted: true, id: rows[0]?.id, voterId };
}

/** Ensure migration ran (backend usually creates the table; keep a local safety net). */
export function ensureNewsTable() {
  runSql(`
CREATE TABLE IF NOT EXISTS news_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL DEFAULT '',
  source TEXT,
  telegram TEXT,
  verdict TEXT NOT NULL CHECK (verdict IN ('pizdato', 'huyevo')),
  reason TEXT NOT NULL DEFAULT '',
  score REAL NOT NULL DEFAULT 0,
  cluster_size INTEGER NOT NULL DEFAULT 1,
  engagement INTEGER NOT NULL DEFAULT 0,
  voter_id TEXT NOT NULL UNIQUE,
  posted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_news_items_created_at ON news_items (created_at);
`);
}

/**
 * Most discussed news that cast a system vote in the rolling window.
 * Rank: cluster_size → score → engagement → newest.
 */
export function topDiscussedNews({ hours = 24 } = {}) {
  const h = Math.max(1, Number(hours) || 24);
  const rows = runSql(
    `
SELECT id, title, url, verdict, reason, score, cluster_size, engagement, created_at
FROM news_items
WHERE created_at >= datetime('now', '-${h} hours')
ORDER BY cluster_size DESC, score DESC, engagement DESC, created_at DESC
LIMIT 1;
`,
    { json: true },
  );
  return rows[0] || null;
}
