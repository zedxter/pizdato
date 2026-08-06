use std::sync::Arc;

use axum::{extract::State, http::StatusCode, Json};
use tower_cookies::{Cookie, Cookies};
use uuid::Uuid;

use crate::{
    db::AppState,
    models::{ErrorResponse, StatsResponse, VoteRequest},
};

const VOTER_COOKIE: &str = "voter_id";
const COOKIE_MAX_AGE: tower_cookies::cookie::time::Duration =
    tower_cookies::cookie::time::Duration::days(365);

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

/// Ensure every visitor has a unique voter_id cookie. New cookie = new voter.
fn ensure_voter_id(cookies: &Cookies, secure: bool) -> String {
    if let Some(existing) = voter_id_from_cookies(cookies) {
        return existing;
    }
    let voter_id = Uuid::new_v4().to_string();
    set_voter_cookie(cookies, &voter_id, secure);
    voter_id
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

pub async fn stats(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
) -> Result<Json<StatsResponse>, StatusCode> {
    let voter_id = ensure_voter_id(&cookies, state.cookie_secure);
    build_stats(&state, &voter_id).await.map(Json).map_err(|e| {
        tracing::error!("stats error: {e}");
        StatusCode::INTERNAL_SERVER_ERROR
    })
}

pub async fn vote(
    State(state): State<Arc<AppState>>,
    cookies: Cookies,
    Json(body): Json<VoteRequest>,
) -> Result<(StatusCode, Json<StatsResponse>), (StatusCode, Json<ErrorResponse>)> {
    let voter_id = ensure_voter_id(&cookies, state.cookie_secure);

    let already = state.find_vote(&voter_id).await.map_err(|e| {
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

    match state.insert_vote(body.choice, &voter_id).await {
        Ok(()) => {
            // Refresh cookie lifetime after a successful vote.
            set_voter_cookie(&cookies, &voter_id, state.cookie_secure);
            let stats = build_stats(&state, &voter_id).await.map_err(|e| {
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
