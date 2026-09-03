mod db;
mod handlers;
mod models;

use axum::{
    Router,
    routing::{get, post},
};
use std::{net::SocketAddr, sync::Arc};
use tower_cookies::CookieManagerLayer;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::EnvFilter;

use crate::db::AppState;

fn env_i64(key: &str, default: i64) -> i64 {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
        .max(1)
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let database_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:votes.db?mode=rwc".to_string());
    let cookie_secure = std::env::var("COOKIE_SECURE")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    let bind = std::env::var("BIND").unwrap_or_else(|_| "127.0.0.1:8080".to_string());
    let ip_salt = std::env::var("VOTE_IP_SALT").unwrap_or_else(|_| {
        tracing::warn!("VOTE_IP_SALT not set; using insecure default for development");
        "dev-insecure-salt-change-me".to_string()
    });
    let ip_daily_limit = env_i64("VOTE_IP_DAILY_LIMIT", 10);
    let ip_min_interval_secs = env_i64("VOTE_IP_MIN_INTERVAL_SECS", 10);
    let session_min_age_secs = env_i64("VOTE_SESSION_MIN_AGE_SECS", 2);
    let ip_403_blacklist_after = env_i64("VOTE_IP_403_BLACKLIST_AFTER", 5);

    let pool = db::connect(&database_url)
        .await
        .expect("failed to connect to database");
    db::migrate_with_retry(&pool, 8)
        .await
        .expect("failed to migrate database");

    let state = Arc::new(AppState {
        pool,
        cookie_secure,
        ip_salt,
        ip_daily_limit,
        ip_min_interval_secs,
        session_min_age_secs,
        ip_403_blacklist_after,
    });

    tracing::info!(
        ip_daily_limit,
        ip_min_interval_secs,
        session_min_age_secs,
        ip_403_blacklist_after,
        "vote rate limits configured"
    );

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_credentials(false);

    let api = Router::new()
        .route("/api/stats", get(handlers::stats))
        .route("/api/vote", post(handlers::vote))
        .route("/api/news", get(handlers::news_feed))
        .route("/api/event", get(handlers::event).post(handlers::event))
        .layer(CookieManagerLayer::new())
        .with_state(state.clone());

    let app = Router::new()
        .route("/health", get(handlers::health))
        .merge(api)
        .layer(cors);

    let addr: SocketAddr = bind.parse().expect("invalid BIND address");
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind");
    tracing::info!("listening on {addr}");
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .expect("server error");
}

/// Build the full Router for testing (avoids starting a real listener).
fn test_app(pool: sqlx::SqlitePool) -> Router {
    use axum::routing::post;

    let state = Arc::new(AppState {
        pool,
        cookie_secure: false,
        ip_salt: "test-salt".to_string(),
        ip_daily_limit: 10,
        ip_min_interval_secs: 10,
        session_min_age_secs: 2,
        ip_403_blacklist_after: 5,
    });

    let api = Router::new()
        .route("/api/stats", get(handlers::stats))
        .route("/api/vote", post(handlers::vote))
        .route("/api/news", get(handlers::news_feed))
        .route("/api/event", get(handlers::event).post(handlers::event))
        .layer(CookieManagerLayer::new())
        .with_state(state.clone());

    Router::new()
        .route("/health", get(handlers::health))
        .merge(api)
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any).allow_credentials(false))
}

#[cfg(test)]
mod integration_tests {
    use axum::{
        body::Body,
        http::Request,
    };
    use serde_json::Value;
    use sqlx::SqlitePool;
    use tower::ServiceExt;

    fn inmemory_pool() -> SqlitePool {
        SqlitePool::connect_lazy(":memory:").expect("in-memory pool")
    }

    #[tokio::test]
    async fn test_health_returns_ok() {
        let pool = inmemory_pool();
        let app = super::test_app(pool);

        let response = app
            .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), 200);

        let body: Value = serde_json::from_slice(
            &axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap(),
        )
        .unwrap();
        assert_eq!(body["ok"], true);
    }

    #[tokio::test]
    async fn test_health_content_type() {
        let pool = inmemory_pool();
        let app = super::test_app(pool);

        let response = app
            .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
            .await
            .unwrap();

        let ct = response.headers().get("content-type").and_then(|v| v.to_str().ok());
        assert!(ct.unwrap_or("").contains("application/json"));
    }
}
