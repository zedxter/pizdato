use sha2::{Digest, Sha256};
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

use crate::models::Choice;

pub struct AppState {
    pub pool: SqlitePool,
    pub ip_salt: String,
    pub cookie_secure: bool,
}

pub async fn connect(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
}

pub async fn migrate(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            choice TEXT NOT NULL CHECK (choice IN ('pizdato', 'huyevo')),
            voter_id TEXT NOT NULL UNIQUE,
            ip_hash TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        "#,
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

    pub async fn find_vote(
        &self,
        voter_id: Option<&str>,
        ip_hash: &str,
    ) -> Result<Option<Choice>, sqlx::Error> {
        if let Some(vid) = voter_id {
            let row: Option<(String,)> =
                sqlx::query_as("SELECT choice FROM votes WHERE voter_id = ?1")
                    .bind(vid)
                    .fetch_optional(&self.pool)
                    .await?;
            if let Some((choice,)) = row {
                return Ok(Choice::parse(&choice));
            }
        }

        let row: Option<(String,)> = sqlx::query_as("SELECT choice FROM votes WHERE ip_hash = ?1")
            .bind(ip_hash)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.and_then(|(c,)| Choice::parse(&c)))
    }

    pub async fn insert_vote(
        &self,
        choice: Choice,
        voter_id: &str,
        ip_hash: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO votes (choice, voter_id, ip_hash) VALUES (?1, ?2, ?3)",
        )
        .bind(choice.as_str())
        .bind(voter_id)
        .bind(ip_hash)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
