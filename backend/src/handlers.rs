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
    cookies
        .get(VOTER_COOKIE)
        .map(|c| c.value().to_string())
        .filter(|v| !v.is_empty())
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

async fn build_stats(state: &AppState, voter_id: &str) -> Result<StatsResponse, sqlx::Error> {
    let (pizdato, huyevo) = state.counts().await?;
    let choice = state.find_vote(voter_id).await?;
    Ok(StatsResponse {
        pizdato,
        huyevo,
        total: pizdato + huyevo,
        voted: choice.is_some(),
        choice,
    })
}

fn empty_stats() -> StatsResponse {
    StatsResponse {
        pizdato: 0,
        huyevo: 0,
        total: 0,
        voted: false,
        choice: None,
    }
}

fn internal_err(stats: StatsResponse) -> (StatusCode, Json<ErrorResponse>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ErrorResponse {
            error: "внутренняя ошибка".into(),
            stats,
        }),
    )
}

/// Issue cookie + DB session only from the main-page stats call.
async fn issue_or_resume_session(
    state: &AppState,
    cookies: &Cookies,
) -> Result<String, sqlx::Error> {
    if let Some(existing) = voter_id_from_cookies(cookies) {
        let known = state.session_exists(&existing).await?
            || state.find_vote(&existing).await?.is_some();
        if known {
            state.register_session(&existing).await?;
            // Refresh cookie lifetime for returning visitors.
            set_voter_cookie(cookies, &existing, state.cookie_secure);
            return Ok(existing);
        }
        // Unknown/forged cookie — replace with a fresh registered session.
    }

    let voter_id = Uuid::new_v4().to_string();
    state.register_session(&voter_id).await?;
    set_voter_cookie(cookies, &voter_id, state.cookie_secure);
    Ok(voter_id)
}

pub async fn stats(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
) -> Result<Json<StatsResponse>, StatusCode> {
    let voter_id = issue_or_resume_session(&state, &cookies).await.map_err(|e| {
        tracing::error!("session issue error: {e}");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    build_stats(&state, &voter_id).await.map(Json).map_err(|e| {
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
    let Some(voter_id) = voter_id_from_cookies(&cookies) else {
        let stats = state
            .counts()
            .await
            .map(|(p, h)| StatsResponse {
                pizdato: p,
                huyevo: h,
                total: p + h,
                voted: false,
                choice: None,
            })
            .unwrap_or_else(|_| empty_stats());
        return Err((
            StatusCode::FORBIDDEN,
            Json(ErrorResponse {
                error: "сначала откройте страницу, затем голосуйте".into(),
                stats,
            }),
        ));
    };

    let registered = state.session_exists(&voter_id).await.map_err(|e| {
        tracing::error!("session lookup error: {e}");
        internal_err(empty_stats())
    })?;

    if !registered {
        let stats = state
            .counts()
            .await
            .map(|(p, h)| StatsResponse {
                pizdato: p,
                huyevo: h,
                total: p + h,
                voted: false,
                choice: None,
            })
            .unwrap_or_else(|_| empty_stats());
        return Err((
            StatusCode::FORBIDDEN,
            Json(ErrorResponse {
                error: "сессия не найдена. обновите страницу и попробуйте снова".into(),
                stats,
            }),
        ));
    }

    let session_age = state.session_age_secs(&voter_id).await.map_err(|e| {
        tracing::error!("session age lookup error: {e}");
        internal_err(empty_stats())
    })?;

    if session_age.unwrap_or(0) < state.session_min_age_secs {
        let stats = build_stats(&state, &voter_id)
            .await
            .unwrap_or_else(|_| empty_stats());
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            Json(ErrorResponse {
                error: "подождите секунду и попробуйте снова".into(),
                stats,
            }),
        ));
    }

    let ip = client_ip(&headers, addr);
    let ip_hash = state.hash_ip(&ip);

    let already = state.find_vote(&voter_id).await.map_err(|e| {
        tracing::error!("vote lookup error: {e}");
        internal_err(empty_stats())
    })?;

    if already.is_some() {
        let stats = build_stats(&state, &voter_id).await.unwrap_or(StatsResponse {
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

    let recent_secs = state
        .seconds_since_last_ip_vote(&ip_hash)
        .await
        .map_err(|e| {
            tracing::error!("ip interval lookup error: {e}");
            internal_err(empty_stats())
        })?;

    if let Some(secs) = recent_secs {
        if secs < state.ip_min_interval_secs {
            let stats = build_stats(&state, &voter_id)
                .await
                .unwrap_or_else(|_| empty_stats());
            return Err((
                StatusCode::TOO_MANY_REQUESTS,
                Json(ErrorResponse {
                    error: "слишком часто. подождите немного и попробуйте снова".into(),
                    stats,
                }),
            ));
        }
    }

    let day_count = state.votes_from_ip_last_day(&ip_hash).await.map_err(|e| {
        tracing::error!("ip daily lookup error: {e}");
        internal_err(empty_stats())
    })?;

    if day_count >= state.ip_daily_limit {
        let stats = build_stats(&state, &voter_id)
            .await
            .unwrap_or_else(|_| empty_stats());
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            Json(ErrorResponse {
                error: "с этого адреса уже много голосов за сутки. загляните завтра".into(),
                stats,
            }),
        ));
    }

    match state.insert_vote(body.choice, &voter_id, &ip_hash).await {
        Ok(()) => {
            let stats = build_stats(&state, &voter_id).await.map_err(|e| {
                tracing::error!("stats after vote error: {e}");
                internal_err(StatsResponse {
                    pizdato: 0,
                    huyevo: 0,
                    total: 0,
                    voted: true,
                    choice: Some(body.choice),
                })
            })?;
            Ok((StatusCode::OK, Json(stats)))
        }
        Err(e) => {
            if let sqlx::Error::Database(db_err) = &e {
                if db_err.is_unique_violation() {
                    let stats = build_stats(&state, &voter_id).await.unwrap_or(StatsResponse {
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
            Err(internal_err(empty_stats()))
        }
    }
}
