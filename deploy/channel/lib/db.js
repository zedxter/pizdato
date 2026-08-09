import Database from "better-sqlite3";
import { createHash } from "node:crypto";

export function dbPath() {
  return (
    process.env.PIZDATO_DB ||
    process.env.PIZDATO_VOTES_DB ||
    "/var/lib/pizdato/votes.db"
  );
}

let _db;

/** Shared read/write connection (WAL-friendly busy timeout). */
export function getDb() {
  if (_db) return _db;
  _db = new Database(dbPath(), { timeout: 8000 });
  _db.pragma("busy_timeout = 8000");
  return _db;
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export function newsVoterId(url) {
  const hash = createHash("sha256").update(String(url)).digest("hex").slice(0, 16);
  return `news:${hash}`;
}

function positiveInt(value, fallback, { min = 1, max = 3650 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function listNewsUrls({ days = 30 } = {}) {
  const d = positiveInt(days, 30);
  const rows = getDb()
    .prepare(
      `SELECT url FROM news_items WHERE created_at >= datetime('now', ?)`,
    )
    .all(`-${d} days`);
  return rows.map((r) => r.url).filter(Boolean);
}

/** Recent news rows for similarity / topic de-dupe (default last 24h). */
export function listRecentNewsItems({ hours = 24 } = {}) {
  const h = positiveInt(hours, 24, { max: 24 * 60 });
  return getDb()
    .prepare(
      `
SELECT id, title, url, summary, created_at
FROM news_items
WHERE created_at >= datetime('now', ?)
ORDER BY created_at DESC
`,
    )
    .all(`-${h} hours`);
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
  const db = getDb();

  const find = db.prepare(`SELECT id FROM news_items WHERE url = ? LIMIT 1`);
  const existing = find.get(url);
  if (existing) {
    return { inserted: false, id: existing.id, voterId };
  }

  const insertNews = db.prepare(`
    INSERT INTO news_items (
      title, url, summary, source, telegram, verdict, reason,
      score, cluster_size, engagement, voter_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertVote = db.prepare(
    `INSERT INTO votes (choice, voter_id, ip_hash) VALUES (?, ?, NULL)`,
  );

  const tx = db.transaction(() => {
    insertNews.run(
      String(title ?? ""),
      String(url ?? ""),
      String(summary ?? ""),
      source == null ? null : String(source),
      telegram == null ? null : String(telegram),
      verdict,
      String(reason ?? ""),
      Number(score) || 0,
      Math.max(1, Number(clusterSize) || 1),
      Math.max(0, Number(engagement) || 0),
      voterId,
    );
    insertVote.run(verdict, voterId);
    return find.get(url);
  });

  const row = tx();
  return { inserted: true, id: row?.id, voterId };
}

/** Ensure migration ran (backend usually creates the table; keep a local safety net). */
export function ensureNewsTable() {
  const db = getDb();
  db.exec(`
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
  const h = positiveInt(hours, 24, { max: 24 * 60 });
  return (
    getDb()
      .prepare(
        `
SELECT id, title, url, verdict, reason, score, cluster_size, engagement, created_at
FROM news_items
WHERE created_at >= datetime('now', ?)
ORDER BY cluster_size DESC, score DESC, engagement DESC, created_at DESC
LIMIT 1
`,
      )
      .get(`-${h} hours`) || null
  );
}

/** Counts for a local calendar day: today | yesterday. */
export function dayTrafficStats(which = "yesterday") {
  const dayExpr =
    which === "today" ? `date('now', 'localtime')` : `date('now', 'localtime', '-1 day')`;
  const db = getDb();

  const dayLabel = db.prepare(`SELECT ${dayExpr} AS d`).get().d;

  const countWhere = (sql) =>
    db.prepare(`SELECT COUNT(*) AS n FROM ${sql}`).get().n;

  // day filter reused — only our fixed dayExpr, never user input.
  const onDay = `date(created_at, 'localtime') = ${dayExpr}`;

  const sessions = countWhere(`sessions WHERE ${onDay}`);
  const sessionsVoted = db
    .prepare(
      `
SELECT COUNT(*) AS n FROM sessions s
WHERE date(s.created_at, 'localtime') = ${dayExpr}
  AND EXISTS (SELECT 1 FROM votes v WHERE v.voter_id = s.voter_id)
`,
    )
    .get().n;

  const humanVotes = countWhere(
    `votes WHERE ${onDay} AND voter_id NOT LIKE 'news:%'`,
  );
  const humanP = countWhere(
    `votes WHERE ${onDay} AND voter_id NOT LIKE 'news:%' AND choice = 'pizdato'`,
  );
  const humanH = countWhere(
    `votes WHERE ${onDay} AND voter_id NOT LIKE 'news:%' AND choice = 'huyevo'`,
  );
  const newsVotes = countWhere(`votes WHERE ${onDay} AND voter_id LIKE 'news:%'`);
  const newsP = countWhere(
    `votes WHERE ${onDay} AND voter_id LIKE 'news:%' AND choice = 'pizdato'`,
  );
  const newsH = countWhere(
    `votes WHERE ${onDay} AND voter_id LIKE 'news:%' AND choice = 'huyevo'`,
  );
  const newsItems = countWhere(`news_items WHERE ${onDay}`);

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
