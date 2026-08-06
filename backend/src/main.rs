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

    let pool = db::connect(&database_url)
        .await
        .expect("failed to connect to database");
    db::migrate(&pool).await.expect("failed to migrate database");

    let state = Arc::new(AppState {
        pool,
        cookie_secure,
    });

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
    axum::serve(listener, app)
        .await
        .expect("server error");
}
