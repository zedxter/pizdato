use std::{net::SocketAddr, sync::Arc};

use axum::{
    extract::{ConnectInfo, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use tower_cookies::{Cookie, Cookies};
use uuid::Uuid;

use crate::{
    db::AppState,
    models::{ErrorResponse, StatsResponse, VoteRequest},
};

const VOTER_COOKIE: &str = "voter_id";
const COOKIE_MAX_AGE: tower_cookies::cookie::time::Duration =
    tower_cookies::cookie::time::Duration::days(365);

fn client_ip(headers: &HeaderMap, addr: SocketAddr) -> String {
    if let Some(xff) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        if let Some(first) = xff.split(',').next() {
            let ip = first.trim();
            if !ip.is_empty() {
                return ip.to_string();
            }
        }
    }
    if let Some(real) = headers.get("x-real-ip").and_then(|v| v.to_str().ok()) {
        let ip = real.trim();
        if !ip.is_empty() {
            return ip.to_string();
        }
    }
    addr.ip().to_string()
}

fn voter_id_from_cookies(cookies: &Cookies) -> Option<String> {
    cookies.get(VOTER_COOKIE).map(|c| c.value().to_string())
}

fn set_voter_cookie(cookies: &Cookies, voter_id: &str, secure: bool) {
    let mut cookie = Cookie::new(VOTER_COOKIE, voter_id.to_string());
    cookie.set_http_only(true);
    cookie.set_path("/");
    cookie.set_same_site(tower_cookies::cookie::SameSite::Lax);
    cookie.set_max_age(COOKIE_MAX_AGE);
    if secure {
        cookie.set_secure(true);
    }
    cookies.add(cookie);
}

async fn build_stats(
    state: &AppState,
    voter_id: Option<&str>,
    ip_hash: &str,
) -> Result<StatsResponse, sqlx::Error> {
    let (pizdato, huyevo) = state.counts().await?;
    let choice = state.find_vote(voter_id, ip_hash).await?;
    Ok(StatsResponse {
        pizdato,
        huyevo,
        total: pizdato + huyevo,
        voted: choice.is_some(),
        choice,
    })
}

pub async fn stats(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    headers: HeaderMap,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> Result<Json<StatsResponse>, StatusCode> {
    let ip = client_ip(&headers, addr);
    let ip_hash = state.hash_ip(&ip);
    let voter_id = voter_id_from_cookies(&cookies);
    build_stats(&state, voter_id.as_deref(), &ip_hash)
        .await
        .map(Json)
        .map_err(|e| {
            tracing::error!("stats error: {e}");
            StatusCode::INTERNAL_SERVER_ERROR
        })
}

pub async fn vote(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    headers: HeaderMap,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(body): Json<VoteRequest>,
) -> Result<(StatusCode, Json<StatsResponse>), (StatusCode, Json<ErrorResponse>)> {
    let ip = client_ip(&headers, addr);
    let ip_hash = state.hash_ip(&ip);
    let existing_voter = voter_id_from_cookies(&cookies);

    let already = state
        .find_vote(existing_voter.as_deref(), &ip_hash)
        .await
        .map_err(|e| {
            tracing::error!("vote lookup error: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "внутренняя ошибка".into(),
                    stats: StatsResponse {
                        pizdato: 0,
                        huyevo: 0,
                        total: 0,
                        voted: false,
                        choice: None,
                    },
                }),
            )
        })?;

    if already.is_some() {
        let stats = build_stats(&state, existing_voter.as_deref(), &ip_hash)
            .await
            .unwrap_or(StatsResponse {
                pizdato: 0,
                huyevo: 0,
                total: 0,
                voted: true,
                choice: already,
            });
        return Err((
            StatusCode::CONFLICT,
            Json(ErrorResponse {
                error: "вы уже проголосовали".into(),
                stats,
            }),
        ));
    }

    let voter_id = existing_voter.unwrap_or_else(|| Uuid::new_v4().to_string());

    match state
        .insert_vote(body.choice, &voter_id, &ip_hash)
        .await
    {
        Ok(()) => {
            set_voter_cookie(&cookies, &voter_id, state.cookie_secure);
            let stats = build_stats(&state, Some(&voter_id), &ip_hash)
                .await
                .map_err(|e| {
                    tracing::error!("stats after vote error: {e}");
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ErrorResponse {
                            error: "внутренняя ошибка".into(),
                            stats: StatsResponse {
                                pizdato: 0,
                                huyevo: 0,
                                total: 0,
                                voted: true,
                                choice: Some(body.choice),
                            },
                        }),
                    )
                })?;
            Ok((StatusCode::OK, Json(stats)))
        }
        Err(e) => {
            // Unique constraint race: treat as already voted
            if let sqlx::Error::Database(db_err) = &e {
                if db_err.is_unique_violation() {
                    let stats = build_stats(&state, Some(&voter_id), &ip_hash)
                        .await
                        .unwrap_or(StatsResponse {
                            pizdato: 0,
                            huyevo: 0,
                            total: 0,
                            voted: true,
                            choice: None,
                        });
                    return Err((
                        StatusCode::CONFLICT,
                        Json(ErrorResponse {
                            error: "вы уже проголосовали".into(),
                            stats,
                        }),
                    ));
                }
            }
            tracing::error!("insert vote error: {e}");
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "внутренняя ошибка".into(),
                    stats: StatsResponse {
                        pizdato: 0,
                        huyevo: 0,
                        total: 0,
                        voted: false,
                        choice: None,
                    },
                }),
            ))
        }
    }
}
