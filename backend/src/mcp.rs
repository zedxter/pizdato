//! Public MCP (Streamable HTTP) for pizdato.net — currently `get_stats`.

use std::sync::Arc;

use rmcp::{
    ErrorData as McpError, ServerHandler,
    handler::server::router::tool::ToolRouter,
    model::*,
    tool, tool_handler, tool_router,
};

use crate::db::AppState;

#[derive(Clone)]
pub struct PizdatoMcp {
    state: Arc<AppState>,
    tool_router: ToolRouter<Self>,
}

#[tool_router]
impl PizdatoMcp {
    pub fn new(state: Arc<AppState>) -> Self {
        Self {
            state,
            tool_router: Self::tool_router(),
        }
    }

    /// Live vote counts from the same DB as `/api/stats` (read-only).
    #[tool(
        name = "get_stats",
        description = "Get live pizdato.net vote statistics: pizdato count, huyevo count, and total."
    )]
    async fn get_stats(&self) -> Result<CallToolResult, McpError> {
        let (pizdato, huyevo) = self.state.counts().await.map_err(|_| {
            McpError::internal_error("failed to read vote stats".to_string(), None)
        })?;
        let total = pizdato + huyevo;
        let pct_p = if total > 0 {
            (pizdato as f64) * 100.0 / (total as f64)
        } else {
            0.0
        };
        let pct_h = if total > 0 {
            (huyevo as f64) * 100.0 / (total as f64)
        } else {
            0.0
        };

        let payload = serde_json::json!({
            "pizdato": pizdato,
            "huyevo": huyevo,
            "total": total,
            "pizdato_pct": (pct_p * 10.0).round() / 10.0,
            "huyevo_pct": (pct_h * 10.0).round() / 10.0,
        });

        Ok(CallToolResult::success(vec![Content::text(
            serde_json::to_string_pretty(&payload).unwrap_or_else(|_| payload.to_string()),
        )]))
    }
}

#[tool_handler]
impl ServerHandler for PizdatoMcp {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            protocol_version: ProtocolVersion::V_2024_11_05,
            capabilities: ServerCapabilities::builder().enable_tools().build(),
            server_info: Implementation {
                name: "pizdato".into(),
                version: env!("CARGO_PKG_VERSION").into(),
                ..Default::default()
            },
            instructions: Some(
                "Tools for pizdato.net. Use get_stats to read live vote counts (пиздато / хуёво). Read-only."
                    .into(),
            ),
            ..Default::default()
        }
    }
}
