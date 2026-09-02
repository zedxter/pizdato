use std::{str::FromStr, time::Duration};

use sha2::{Digest, Sha256};
use sqlx::{
    SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
};

use crate::models::Choice;

pub struct AppState {
    pub pool: SqlitePool,
    pub cookie_secure: bool,
    pub ip_salt: String,
    /// Max POST /api/vote attempts per IP hash per rolling day (any status).
    pub ip_daily_limit: i64,
    pub ip_min_interval_secs: i64,
    pub session_min_age_secs: i64,
    /// After this many HTTP 403 vote responses in a day, IP is blacklisted.
    pub ip_403_blacklist_after: i64,
}

fn is_db_locked(err: &sqlx::Error) -> bool {
    match err {
        sqlx::Error::Database(db) => {
            let msg = db.message();
            msg.contains("database is locked") || msg.contains("database table is locked")
        }
        sqlx::Error::PoolTimedOut => true,
        _ => false,
    }
}

/// Transient SQLite failures worth retrying (locks, brief CANTOPEN under WAL writers).
fn is_db_transient(err: &sqlx::Error) -> bool {
    if is_db_locked(err) {
        return true;
    }
    match err {
        sqlx::Error::Database(db) => {
            let msg = db.message().to_ascii_lowercase();
            msg.contains("unable to open database file")
                || msg.contains("disk i/o error")
                || db
                    .code()
                    .map(|c| c == "5" || c == "14" || c == "10")
                    .unwrap_or(false)
        }
        _ => false,
    }
}

pub async fn with_sqlite_retry<T, F, Fut>(
    label: &str,
    attempts: u32,
    mut op: F,
) -> Result<T, sqlx::Error>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<T, sqlx::Error>>,
{
    let attempts = attempts.max(1);
    let mut delay = Duration::from_millis(40);

    for attempt in 1..=attempts {
        match op().await {
            Ok(v) => return Ok(v),
            Err(e) if is_db_transient(&e) && attempt < attempts => {
                tracing::warn!(
                    attempt,
                    next_delay_ms = delay.as_millis() as u64,
                    error = %e,
                    "{label}: transient sqlite error; retrying"
                );
                tokio::time::sleep(delay).await;
                delay = (delay * 2).min(Duration::from_millis(800));
            }
            Err(e) => return Err(e),
        }
    }

    unreachable!("with_sqlite_retry loop must return")
}

pub async fn connect(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    let options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
        .busy_timeout(Duration::from_secs(5));

    // SQLite prefers few writers; WAL still allows concurrent readers on these conns.
    SqlitePoolOptions::new()
        .max_connections(2)
        .acquire_timeout(Duration::from_secs(10))
        .connect_with(options)
        .await
}

pub async fn migrate_with_retry(pool: &SqlitePool, attempts: u32) -> Result<(), sqlx::Error> {
    let attempts = attempts.max(1);
    let mut delay = Duration::from_millis(200);

    for attempt in 1..=attempts {
        match migrate(pool).await {
            Ok(()) => return Ok(()),
            Err(e) if is_db_locked(&e) && attempt < attempts => {
                tracing::warn!(
                    attempt,
                    next_delay_ms = delay.as_millis() as u64,
                    error = %e,
                    "database locked during migrate; retrying"
                );
                tokio::time::sleep(delay).await;
                delay = (delay * 2).min(Duration::from_secs(5));
            }
            Err(e) => return Err(e),
        }
    }

    unreachable!("migrate_with_retry loop must return")
}

async fn table_exists(pool: &SqlitePool, name: &str) -> Result<bool, sqlx::Error> {
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1")
            .bind(name)
            .fetch_one(pool)
            .await?;
    Ok(count > 0)
}

async fn has_ip_hash_column(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('votes') WHERE name = 'ip_hash'",
    )
    .fetch_one(pool)
    .await?;
    Ok(count > 0)
}

async fn has_news_image_url_column(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('news_items') WHERE name = 'image_url'",
    )
    .fetch_one(pool)
    .await?;
    Ok(count > 0)
}

pub async fn migrate(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    if table_exists(pool, "votes_new").await? {
        tracing::info!("finishing interrupted votes migration");
        if table_exists(pool, "votes").await? {
            let votes_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM votes")
                .fetch_one(pool)
                .await?;
            let new_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM votes_new")
                .fetch_one(pool)
                .await?;
            if new_count >= votes_count {
                sqlx::query("DROP TABLE votes").execute(pool).await?;
            } else {
                sqlx::query("DROP TABLE votes_new").execute(pool).await?;
            }
        }
        if table_exists(pool, "votes_new").await? {
            sqlx::query("ALTER TABLE votes_new RENAME TO votes")
                .execute(pool)
                .await?;
        }
    }

    if !table_exists(pool, "votes").await? {
        sqlx::query(
            r#"
            CREATE TABLE votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                choice TEXT NOT NULL CHECK (choice IN ('pizdato', 'huyevo')),
                voter_id TEXT NOT NULL UNIQUE,
                ip_hash TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(pool)
        .await?;
    } else if !has_ip_hash_column(pool).await? {
        tracing::info!("adding non-unique ip_hash column for rate limits");
        sqlx::query("ALTER TABLE votes ADD COLUMN ip_hash TEXT")
            .execute(pool)
            .await?;
    }

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_votes_ip_hash_created_at ON votes (ip_hash, created_at)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sessions (
            voter_id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Backfill sessions for anyone who already voted (legacy cookies).
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO sessions (voter_id, created_at)
        SELECT voter_id, created_at FROM votes
        "#,
    )
    .execute(pool)
    .await?;

    // Drop stale orphan sessions (e.g. vote-farm cookies) but keep a short
    // browsing window so an open tab can still vote after /api/stats.
    let pruned = sqlx::query(
        r#"
        DELETE FROM sessions
        WHERE created_at < datetime('now', '-30 minutes')
          AND NOT EXISTS (
              SELECT 1 FROM votes v WHERE v.voter_id = sessions.voter_id
          )
        "#,
    )
    .execute(pool)
    .await?
    .rows_affected();
    if pruned > 0 {
        tracing::info!(pruned, "pruned stale orphan sessions");
    }

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ip_vote_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_hash TEXT NOT NULL,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_ip_vote_requests_ip_created ON ip_vote_requests (ip_hash, created_at)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ip_blacklist (
            ip_hash TEXT PRIMARY KEY,
            reason TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        "#,
    )
    .execute(pool)
    .await?;

    let pruned_req =
        sqlx::query("DELETE FROM ip_vote_requests WHERE created_at < datetime('now', '-7 days')")
            .execute(pool)
            .await?
            .rows_affected();
    if pruned_req > 0 {
        tracing::info!(pruned_req, "pruned old ip vote request logs");
    }

    // Hourly channel cron stores scored news here; evening may consume later.
    sqlx::query(
        r#"
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
            image_url TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        "#,
    )
    .execute(pool)
    .await?;

    if !has_news_image_url_column(pool).await? {
        tracing::info!("adding news_items.image_url for feed thumbnails");
        sqlx::query("ALTER TABLE news_items ADD COLUMN image_url TEXT")
            .execute(pool)
            .await?;
    }

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_news_items_created_at ON news_items (created_at)")
        .execute(pool)
        .await?;

    Ok(())
}

impl AppState {
    pub fn hash_ip(&self, ip: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(self.ip_salt.as_bytes());
        hasher.update(ip.as_bytes());
        hex::encode(hasher.finalize())
    }

    pub async fn counts(&self) -> Result<(i64, i64), sqlx::Error> {
        let row: (i64, i64) = sqlx::query_as(
            r#"
            SELECT
                COALESCE(SUM(CASE WHEN choice = 'pizdato' THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN choice = 'huyevo' THEN 1 ELSE 0 END), 0)
            FROM votes v
            WHERE v.ip_hash IS NULL
               OR NOT EXISTS (
                    SELECT 1 FROM ip_blacklist b WHERE b.ip_hash = v.ip_hash
               )
            "#,
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn is_ip_blacklisted(&self, ip_hash: &str) -> Result<bool, sqlx::Error> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ip_blacklist WHERE ip_hash = ?1")
            .bind(ip_hash)
            .fetch_one(&self.pool)
            .await?;
        Ok(count > 0)
    }

    pub async fn record_vote_request(&self, ip_hash: &str, status: i64) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO ip_vote_requests (ip_hash, status) VALUES (?1, ?2)")
            .bind(ip_hash)
            .bind(status)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn vote_requests_from_ip_last_day(&self, ip_hash: &str) -> Result<i64, sqlx::Error> {
        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM ip_vote_requests
            WHERE ip_hash = ?1
              AND created_at >= datetime('now', '-1 day')
            "#,
        )
        .bind(ip_hash)
        .fetch_one(&self.pool)
        .await?;
        Ok(count)
    }

    pub async fn forbidden_from_ip_last_day(&self, ip_hash: &str) -> Result<i64, sqlx::Error> {
        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM ip_vote_requests
            WHERE ip_hash = ?1
              AND status = 403
              AND created_at >= datetime('now', '-1 day')
            "#,
        )
        .bind(ip_hash)
        .fetch_one(&self.pool)
        .await?;
        Ok(count)
    }

    pub async fn blacklist_ip_if_needed(
        &self,
        ip_hash: &str,
        reason: &str,
    ) -> Result<bool, sqlx::Error> {
        if self.is_ip_blacklisted(ip_hash).await? {
            return Ok(false);
        }
        let forbidden = self.forbidden_from_ip_last_day(ip_hash).await?;
        if forbidden < self.ip_403_blacklist_after {
            return Ok(false);
        }
        let res =
            sqlx::query("INSERT OR IGNORE INTO ip_blacklist (ip_hash, reason) VALUES (?1, ?2)")
                .bind(ip_hash)
                .bind(reason)
                .execute(&self.pool)
                .await?;
        if res.rows_affected() > 0 {
            tracing::warn!(
                forbidden,
                threshold = self.ip_403_blacklist_after,
                "ip blacklisted after repeated 403 vote responses"
            );
            return Ok(true);
        }
        Ok(false)
    }

    pub async fn find_vote(&self, voter_id: &str) -> Result<Option<Choice>, sqlx::Error> {
        let row: Option<(String,)> = sqlx::query_as("SELECT choice FROM votes WHERE voter_id = ?1")
            .bind(voter_id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.and_then(|(c,)| Choice::parse(&c)))
    }

    pub async fn session_exists(&self, voter_id: &str) -> Result<bool, sqlx::Error> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sessions WHERE voter_id = ?1")
            .bind(voter_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(count > 0)
    }

    pub async fn session_age_secs(&self, voter_id: &str) -> Result<Option<i64>, sqlx::Error> {
        let secs: Option<i64> = sqlx::query_scalar(
            r#"
            SELECT CAST(
                (julianday('now') - julianday(created_at)) * 86400
            AS INTEGER)
            FROM sessions
            WHERE voter_id = ?1
            "#,
        )
        .bind(voter_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(secs)
    }

    pub async fn register_session(&self, voter_id: &str) -> Result<(), sqlx::Error> {
        let id = voter_id.to_string();
        let pool = self.pool.clone();
        with_sqlite_retry("register_session", 6, || {
            let id = id.clone();
            let pool = pool.clone();
            async move {
                sqlx::query("INSERT OR IGNORE INTO sessions (voter_id) VALUES (?1)")
                    .bind(id)
                    .execute(&pool)
                    .await?;
                Ok(())
            }
        })
        .await
    }

    pub async fn seconds_since_last_ip_vote(
        &self,
        ip_hash: &str,
    ) -> Result<Option<i64>, sqlx::Error> {
        let secs: Option<i64> = sqlx::query_scalar(
            r#"
            SELECT CAST(
                (julianday('now') - julianday(created_at)) * 86400
            AS INTEGER)
            FROM votes
            WHERE ip_hash = ?1
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            "#,
        )
        .bind(ip_hash)
        .fetch_optional(&self.pool)
        .await?;
        Ok(secs)
    }

    pub async fn insert_vote(
        &self,
        choice: Choice,
        voter_id: &str,
        ip_hash: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO votes (choice, voter_id, ip_hash) VALUES (?1, ?2, ?3)")
            .bind(choice.as_str())
            .bind(voter_id)
            .bind(ip_hash)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Public news feed (hourly verdicts), newest first. Cursor: id < before_id.
    pub async fn list_news(
        &self,
        limit: i64,
        before_id: Option<i64>,
    ) -> Result<Vec<(i64, String, String, String, String, String, Option<String>)>, sqlx::Error>
    {
        let limit = limit.clamp(1, 50);
        if let Some(before) = before_id {
            sqlx::query_as(
                r#"
                SELECT id, title, url, verdict, reason, created_at, image_url
                FROM news_items
                WHERE id < ?1
                ORDER BY id DESC
                LIMIT ?2
                "#,
            )
            .bind(before)
            .bind(limit)
            .fetch_all(&self.pool)
            .await
        } else {
            sqlx::query_as(
                r#"
                SELECT id, title, url, verdict, reason, created_at, image_url
                FROM news_items
                ORDER BY id DESC
                LIMIT ?1
                "#,
            )
            .bind(limit)
            .fetch_all(&self.pool)
            .await
        }
    }
}
