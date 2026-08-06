use sha2::{Digest, Sha256};
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

use crate::models::Choice;

pub struct AppState {
    pub pool: SqlitePool,
    pub cookie_secure: bool,
    pub ip_salt: String,
    pub ip_daily_limit: i64,
    pub ip_min_interval_secs: i64,
}

pub async fn connect(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
}

async fn table_exists(pool: &SqlitePool, name: &str) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
    )
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

pub async fn migrate(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Finish a previously interrupted migration.
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
            FROM votes
            "#,
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    pub async fn find_vote(&self, voter_id: &str) -> Result<Option<Choice>, sqlx::Error> {
        let row: Option<(String,)> =
            sqlx::query_as("SELECT choice FROM votes WHERE voter_id = ?1")
                .bind(voter_id)
                .fetch_optional(&self.pool)
                .await?;
        Ok(row.and_then(|(c,)| Choice::parse(&c)))
    }

    pub async fn votes_from_ip_last_day(&self, ip_hash: &str) -> Result<i64, sqlx::Error> {
        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM votes
            WHERE ip_hash = ?1
              AND created_at >= datetime('now', '-1 day')
            "#,
        )
        .bind(ip_hash)
        .fetch_one(&self.pool)
        .await?;
        Ok(count)
    }

    pub async fn seconds_since_last_ip_vote(&self, ip_hash: &str) -> Result<Option<i64>, sqlx::Error> {
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
}
