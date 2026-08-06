use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

use crate::models::Choice;

pub struct AppState {
    pub pool: SqlitePool,
    pub cookie_secure: bool,
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
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(pool)
        .await?;
        return Ok(());
    }

    // Older installs keyed uniqueness by IP as well — drop that.
    if has_ip_hash_column(pool).await? {
        tracing::info!("migrating votes table: removing ip_hash uniqueness");
        sqlx::query("DROP TABLE IF EXISTS votes_new")
            .execute(pool)
            .await?;
        sqlx::query(
            r#"
            CREATE TABLE votes_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                choice TEXT NOT NULL CHECK (choice IN ('pizdato', 'huyevo')),
                voter_id TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(pool)
        .await?;
        sqlx::query(
            r#"
            INSERT INTO votes_new (id, choice, voter_id, created_at)
            SELECT id, choice, voter_id, created_at FROM votes
            "#,
        )
        .execute(pool)
        .await?;
        sqlx::query("DROP TABLE votes").execute(pool).await?;
        sqlx::query("ALTER TABLE votes_new RENAME TO votes")
            .execute(pool)
            .await?;
    }

    Ok(())
}

impl AppState {
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

    pub async fn insert_vote(&self, choice: Choice, voter_id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO votes (choice, voter_id) VALUES (?1, ?2)")
            .bind(choice.as_str())
            .bind(voter_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
