mod db;
mod handlers;
mod models;

use axum::{
    routing::{get, post},
    Router,
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

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:votes.db?mode=rwc".to_string());
    let cookie_secure = std::env::var("COOKIE_SECURE")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    let bind = std::env::var("BIND").unwrap_or_else(|_| "127.0.0.1:8080".to_string());
    let ip_salt = std::env::var("VOTE_IP_SALT").unwrap_or_else(|_| {
        tracing::warn!("VOTE_IP_SALT not set; using insecure default for development");
        "dev-insecure-salt-change-me".to_string()
    });
    let ip_daily_limit = env_i64("VOTE_IP_DAILY_LIMIT", 5);
    let ip_min_interval_secs = env_i64("VOTE_IP_MIN_INTERVAL_SECS", 10);

    let pool = db::connect(&database_url)
        .await
        .expect("failed to connect to database");
    db::migrate(&pool).await.expect("failed to migrate database");

    let state = Arc::new(AppState {
        pool,
        cookie_secure,
        ip_salt,
        ip_daily_limit,
        ip_min_interval_secs,
    });

    tracing::info!(
        ip_daily_limit,
        ip_min_interval_secs,
        "vote rate limits configured"
    );

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_credentials(false);

    let app = Router::new()
        .route("/api/stats", get(handlers::stats))
        .route("/api/vote", post(handlers::vote))
        .layer(CookieManagerLayer::new())
        .layer(cors)
        .with_state(state);

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
