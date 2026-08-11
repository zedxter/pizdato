use std::{net::SocketAddr, sync::Arc};

use axum::{
    extract::{ConnectInfo, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use tower_cookies::{Cookie, Cookies};
use uuid::Uuid;

use crate::{
    db::AppState,
    models::{
        Choice, ErrorResponse, NewsFeedResponse, NewsItemPublic, StatsResponse, VoteRequest,
    },
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

async fn counts_stats(state: &AppState) -> StatsResponse {
    state
        .counts()
        .await
        .map(|(p, h)| StatsResponse {
            pizdato: p,
            huyevo: h,
            total: p + h,
            voted: false,
            choice: None,
        })
        .unwrap_or_else(|_| empty_stats())
}

/// Log vote attempt; on 403, maybe blacklist the IP.
async fn note_vote_outcome(state: &AppState, ip_hash: &str, status: StatusCode) {
    let code = status.as_u16() as i64;
    if let Err(e) = state.record_vote_request(ip_hash, code).await {
        tracing::error!("record vote request error: {e}");
        return;
    }
    if status == StatusCode::FORBIDDEN {
        let reason = format!(
            ">= {} HTTP 403 vote responses in 24h",
            state.ip_403_blacklist_after
        );
        if let Err(e) = state.blacklist_ip_if_needed(ip_hash, &reason).await {
            tracing::error!("blacklist check error: {e}");
        }
    }
}

fn reject(
    status: StatusCode,
    error: impl Into<String>,
    stats: StatsResponse,
) -> (StatusCode, Json<ErrorResponse>) {
    (
        status,
        Json(ErrorResponse {
            error: error.into(),
            stats,
        }),
    )
}

/// Issue cookie + DB session only from the main-page stats call.
async fn issue_or_resume_session(
    state: &AppState,
    cookies: &Cookies,
) -> Result<String, sqlx::Error> {
    crate::db::with_sqlite_retry("issue_or_resume_session", 6, || async {
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
    })
    .await
}

pub async fn stats(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
) -> Result<Json<StatsResponse>, StatusCode> {
    match issue_or_resume_session(&state, &cookies).await {
        Ok(voter_id) => build_stats(&state, &voter_id).await.map(Json).map_err(|e| {
            tracing::error!("stats error: {e}");
            StatusCode::INTERNAL_SERVER_ERROR
        }),
        Err(e) => {
            // Prefer showing live counts over a blank page when sessions briefly flake
            // (e.g. hourly news writer contending on the same SQLite file).
            tracing::error!("session issue error: {e}");
            Ok(Json(counts_stats(&state).await))
        }
    }
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

    let blacklisted = state.is_ip_blacklisted(&ip_hash).await.map_err(|e| {
        tracing::error!("blacklist lookup error: {e}");
        internal_err(empty_stats())
    })?;
    if blacklisted {
        note_vote_outcome(&state, &ip_hash, StatusCode::FORBIDDEN).await;
        return Err(reject(
            StatusCode::FORBIDDEN,
            "голос с этого адреса не учитывается",
            counts_stats(&state).await,
        ));
    }

    let day_requests = state
        .vote_requests_from_ip_last_day(&ip_hash)
        .await
        .map_err(|e| {
            tracing::error!("ip request daily lookup error: {e}");
            internal_err(empty_stats())
        })?;
    if day_requests >= state.ip_daily_limit {
        note_vote_outcome(&state, &ip_hash, StatusCode::FORBIDDEN).await;
        return Err(reject(
            StatusCode::FORBIDDEN,
            "с этого адреса слишком много попыток за сутки",
            counts_stats(&state).await,
        ));
    }

    let Some(voter_id) = voter_id_from_cookies(&cookies) else {
        note_vote_outcome(&state, &ip_hash, StatusCode::FORBIDDEN).await;
        return Err(reject(
            StatusCode::FORBIDDEN,
            "сначала откройте страницу, затем голосуйте",
            counts_stats(&state).await,
        ));
    };

    let registered = state.session_exists(&voter_id).await.map_err(|e| {
        tracing::error!("session lookup error: {e}");
        internal_err(empty_stats())
    })?;

    if !registered {
        note_vote_outcome(&state, &ip_hash, StatusCode::FORBIDDEN).await;
        return Err(reject(
            StatusCode::FORBIDDEN,
            "сессия не найдена. обновите страницу и попробуйте снова",
            counts_stats(&state).await,
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
        note_vote_outcome(&state, &ip_hash, StatusCode::TOO_MANY_REQUESTS).await;
        return Err(reject(
            StatusCode::TOO_MANY_REQUESTS,
            "подождите секунду и попробуйте снова",
            stats,
        ));
    }

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
        // Conflict is normal re-click — still counts toward daily request budget.
        note_vote_outcome(&state, &ip_hash, StatusCode::CONFLICT).await;
        return Err(reject(
            StatusCode::CONFLICT,
            "вы уже проголосовали",
            stats,
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
            note_vote_outcome(&state, &ip_hash, StatusCode::TOO_MANY_REQUESTS).await;
            return Err(reject(
                StatusCode::TOO_MANY_REQUESTS,
                "слишком часто. подождите немного и попробуйте снова",
                stats,
            ));
        }
    }

    match state.insert_vote(body.choice, &voter_id, &ip_hash).await {
        Ok(()) => {
            note_vote_outcome(&state, &ip_hash, StatusCode::OK).await;
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
                    note_vote_outcome(&state, &ip_hash, StatusCode::CONFLICT).await;
                    return Err(reject(
                        StatusCode::CONFLICT,
                        "вы уже проголосовали",
                        stats,
                    ));
                }
            }
            tracing::error!("insert vote error: {e}");
            Err(internal_err(empty_stats()))
        }
    }
}

#[derive(Debug, serde::Deserialize)]
pub struct NewsFeedQuery {
    pub limit: Option<i64>,
    pub before_id: Option<i64>,
}

/// Public feed of hourly news verdicts (newest first).
pub async fn news_feed(
    State(state): State<Arc<AppState>>,
    Query(q): Query<NewsFeedQuery>,
) -> Result<Json<NewsFeedResponse>, (StatusCode, Json<serde_json::Value>)> {
    let limit = q.limit.unwrap_or(20).clamp(1, 50);
    let rows = state.list_news(limit, q.before_id).await.map_err(|e| {
        tracing::error!("list news error: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "не удалось загрузить ленту" })),
        )
    })?;

    let items: Vec<NewsItemPublic> = rows
        .into_iter()
        .filter_map(|(id, title, url, verdict, reason, created_at, image_url)| {
            let verdict = Choice::parse(&verdict)?;
            let image_url = image_url.and_then(|s| {
                let t = s.trim().to_string();
                if t.is_empty() {
                    None
                } else {
                    Some(t)
                }
            });
            Some(NewsItemPublic {
                id,
                title,
                url,
                verdict,
                reason,
                created_at,
                image_url,
            })
        })
        .collect();

    let next_before_id = if items.len() as i64 >= limit {
        items.last().map(|i| i.id)
    } else {
        None
    };

    Ok(Json(NewsFeedResponse {
        items,
        next_before_id,
    }))
}
