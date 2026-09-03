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

#[cfg(test)]
fn connect_inmemory() -> SqlitePool {
    use sqlx::sqlite::SqlitePoolOptions;
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect_lazy(":memory:")
        .expect("failed to create in-memory pool")
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Choice;

    /// Helper: create an in-memory pool with full schema, return an AppState.
    async fn test_state() -> AppState {
        let pool = connect_inmemory();
        // Create tables manually for test isolation (faster than full migrate)
        sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS votes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    choice TEXT NOT NULL CHECK (choice IN ('pizdato', 'huyevo')),
                    voter_id TEXT NOT NULL UNIQUE,
                    ip_hash TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
                "#,
            )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS sessions (
                    voter_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
                "#,
            )
        .execute(&pool)
        .await
        .unwrap();

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
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS ip_blacklist (
                    ip_hash TEXT PRIMARY KEY,
                    reason TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
                "#,
            )
            .execute(&pool)
        .await
        .unwrap();

        AppState {
            pool,
            cookie_secure: false,
            ip_salt: "test-salt".to_string(),
            ip_daily_limit: 10,
            ip_min_interval_secs: 10,
            session_min_age_secs: 2,
            ip_403_blacklist_after: 5,
        }
    }

    #[tokio::test]
    async fn test_counts_empty() {
        let state = test_state().await;
        let (pizdato, huyevo) = state.counts().await.unwrap();
        assert_eq!(pizdato, 0);
        assert_eq!(huyevo, 0);
    }

    #[tokio::test]
    async fn test_counts_after_votes() {
        let state = test_state().await;
        let ip = state.hash_ip("1.2.3.4");

        state.insert_vote(Choice::Pizdato, "voter-1", &ip).await.unwrap();
        state.insert_vote(Choice::Huyevo, "voter-2", &ip).await.unwrap();
        state.insert_vote(Choice::Pizdato, "voter-3", &ip).await.unwrap();

        let (pizdato, huyevo) = state.counts().await.unwrap();
        assert_eq!(pizdato, 2);
        assert_eq!(huyevo, 1);
    }

    #[tokio::test]
    async fn test_counts_excludes_blacklisted() {
        let state = test_state().await;
        let ip = state.hash_ip("1.2.3.4");

        state.insert_vote(Choice::Pizdato, "voter-1", &ip).await.unwrap();
        state.insert_vote(Choice::Huyevo, "voter-2", &ip).await.unwrap();

        // Blacklist the IP
        sqlx::query("INSERT INTO ip_blacklist (ip_hash, reason) VALUES (?1, ?2)")
            .bind(&ip)
            .bind("test")
            .execute(&state.pool)
            .await
            .unwrap();

        let (pizdato, huyevo) = state.counts().await.unwrap();
        assert_eq!(pizdato, 0);
        assert_eq!(huyevo, 0);
    }

    #[tokio::test]
    async fn test_counts_includes_null_ip_votes() {
        let state = test_state().await;
        // Votes without ip_hash should always be counted
        sqlx::query("INSERT INTO votes (choice, voter_id, ip_hash) VALUES (?1, ?2, NULL)")
            .bind(Choice::Pizdato.as_str())
            .bind("voter-no-ip")
            .execute(&state.pool)
            .await
            .unwrap();

        let (pizdato, huyevo) = state.counts().await.unwrap();
        assert_eq!(pizdato, 1);
        assert_eq!(huyevo, 0);
    }

    #[tokio::test]
    async fn test_insert_vote_success() {
        let state = test_state().await;
        let ip = state.hash_ip("5.6.7.8");

        state.insert_vote(Choice::Pizdato, "voter-insert-1", &ip).await.unwrap();

        // Verify by reading back
        let choice = state.find_vote("voter-insert-1").await.unwrap();
        assert_eq!(choice, Some(Choice::Pizdato));
    }

    #[tokio::test]
    async fn test_insert_vote_duplicate_voter() {
        let state = test_state().await;
        let ip = state.hash_ip("5.6.7.8");

        state.insert_vote(Choice::Pizdato, "voter-dup-1", &ip).await.unwrap();
        let result = state.insert_vote(Choice::Huyevo, "voter-dup-1", &ip).await;
        assert!(result.is_err(), "duplicate voter_id should fail");
    }

    #[tokio::test]
    async fn test_insert_vote_huyevo() {
        let state = test_state().await;
        let ip = state.hash_ip("9.10.11.12");

        state.insert_vote(Choice::Huyevo, "voter-huyevo-1", &ip).await.unwrap();
        let choice = state.find_vote("voter-huyevo-1").await.unwrap();
        assert_eq!(choice, Some(Choice::Huyevo));
    }

    #[tokio::test]
    async fn test_vote_requests_from_ip() {
        let state = test_state().await;
        let ip = state.hash_ip("1.1.1.1");

        // No requests yet
        assert_eq!(state.vote_requests_from_ip_last_day(&ip).await.unwrap(), 0);

        // Record some requests
        state.record_vote_request(&ip, 200).await.unwrap();
        state.record_vote_request(&ip, 200).await.unwrap();
        assert_eq!(state.vote_requests_from_ip_last_day(&ip).await.unwrap(), 2);

        // Different IP should have 0 requests
        let ip2 = state.hash_ip("2.2.2.2");
        assert_eq!(state.vote_requests_from_ip_last_day(&ip2).await.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_forbidden_from_ip() {
        let state = test_state().await;
        let ip = state.hash_ip("3.3.3.3");

        // Mixed statuses
        state.record_vote_request(&ip, 200).await.unwrap();
        state.record_vote_request(&ip, 403).await.unwrap();
        state.record_vote_request(&ip, 403).await.unwrap();

        assert_eq!(state.forbidden_from_ip_last_day(&ip).await.unwrap(), 2);
    }

    #[tokio::test]
    async fn test_ip_blacklist() {
        let state = test_state().await;
        let ip = state.hash_ip("4.4.4.4");

        assert!(!state.is_ip_blacklisted(&ip).await.unwrap());

        // Add to blacklist
        sqlx::query("INSERT INTO ip_blacklist (ip_hash, reason) VALUES (?1, ?2)")
            .bind(&ip)
            .bind("abuse")
            .execute(&state.pool)
            .await
            .unwrap();

        assert!(state.is_ip_blacklisted(&ip).await.unwrap());
    }

    #[tokio::test]
    async fn test_blacklist_ip_if_needed_noop_below_threshold() {
        let state = test_state().await;
        let ip = state.hash_ip("6.6.6.6");

        // Add some 403s but below threshold
        state.record_vote_request(&ip, 403).await.unwrap();
        state.record_vote_request(&ip, 403).await.unwrap();
        state.record_vote_request(&ip, 403).await.unwrap();

        let blacklisted = state.blacklist_ip_if_needed(&ip, "test").await.unwrap();
        assert!(!blacklisted, "should not blacklist below threshold (5)");
    }

    #[tokio::test]
    async fn test_blacklist_ip_if_needed_at_threshold() {
        let state = test_state().await;
        let ip = state.hash_ip("7.7.7.7");

        // Add exactly threshold number of 403s
        for _ in 0..5 {
            state.record_vote_request(&ip, 403).await.unwrap();
        }

        let blacklisted = state.blacklist_ip_if_needed(&ip, "test").await.unwrap();
        assert!(blacklisted, "should blacklist at threshold");
        assert!(state.is_ip_blacklisted(&ip).await.unwrap());
    }

    #[tokio::test]
    async fn test_blacklist_ip_if_needed_already_blacklisted() {
        let state = test_state().await;
        let ip = state.hash_ip("8.8.8.8");

        // Pre-blacklist
        sqlx::query("INSERT INTO ip_blacklist (ip_hash, reason) VALUES (?1, ?2)")
            .bind(&ip)
            .bind("already")
            .execute(&state.pool)
            .await
            .unwrap();

        let blacklisted = state.blacklist_ip_if_needed(&ip, "test").await.unwrap();
        assert!(!blacklisted, "already blacklisted should return false");
    }

    #[tokio::test]
    async fn test_seconds_since_last_ip_vote_no_votes() {
        let state = test_state().await;
        let ip = state.hash_ip("10.10.10.10");

        let secs = state.seconds_since_last_ip_vote(&ip).await.unwrap();
        assert!(secs.is_none(), "no votes should return None");
    }

    #[tokio::test]
    async fn test_seconds_since_last_ip_vote_after_vote() {
        let state = test_state().await;
        let ip = state.hash_ip("11.11.11.11");

        state.insert_vote(Choice::Pizdato, "voter-sec-1", &ip).await.unwrap();

        let secs = state.seconds_since_last_ip_vote(&ip).await.unwrap();
        assert!(secs.is_some(), "should return Some after a vote");
        assert!(secs.unwrap() >= 0, "seconds should be non-negative");
    }

    #[tokio::test]
    async fn test_hash_ip_deterministic() {
        let state = test_state().await;
        let h1 = state.hash_ip("192.168.1.1");
        let h2 = state.hash_ip("192.168.1.1");
        assert_eq!(h1, h2, "same IP should produce same hash");

        let h3 = state.hash_ip("10.0.0.1");
        assert_ne!(h1, h3, "different IPs should produce different hashes");
    }

    #[tokio::test]
    async fn test_hash_ip_different_salt() {
        let mut state = test_state().await;
        state.ip_salt = "different-salt".to_string();
        let h1 = state.hash_ip("192.168.1.1");

        let mut state2 = test_state().await;
        state2.ip_salt = "another-salt".to_string();
        let h2 = state2.hash_ip("192.168.1.1");

        assert_ne!(h1, h2, "different salts should produce different hashes");
    }

    #[tokio::test]
    async fn test_session_exists() {
        let state = test_state().await;

        assert!(!state.session_exists("nonexistent").await.unwrap());

        state.register_session("session-user-1").await.unwrap();
        assert!(state.session_exists("session-user-1").await.unwrap());
    }

    #[tokio::test]
    async fn test_find_vote_nonexistent() {
        let state = test_state().await;
        let choice = state.find_vote("no-such-voter").await.unwrap();
        assert_eq!(choice, None);
    }

    #[tokio::test]
    async fn test_find_vote_exists() {
        let state = test_state().await;
        let ip = state.hash_ip("12.12.12.12");

        state.insert_vote(Choice::Huyevo, "voter-find-1", &ip).await.unwrap();
        let choice = state.find_vote("voter-find-1").await.unwrap();
        assert_eq!(choice, Some(Choice::Huyevo));
    }
}