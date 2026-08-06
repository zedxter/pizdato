use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Choice {
    Pizdato,
    Huyevo,
}

impl Choice {
    pub fn as_str(self) -> &'static str {
        match self {
            Choice::Pizdato => "pizdato",
            Choice::Huyevo => "huyevo",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "pizdato" => Some(Choice::Pizdato),
            "huyevo" => Some(Choice::Huyevo),
            _ => None,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct StatsResponse {
    pub pizdato: i64,
    pub huyevo: i64,
    pub total: i64,
    pub voted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub choice: Option<Choice>,
}

#[derive(Debug, Deserialize)]
pub struct VoteRequest {
    pub choice: Choice,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub stats: StatsResponse,
}
