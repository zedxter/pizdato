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

#[derive(Debug, Serialize)]
pub struct NewsItemPublic {
    pub id: i64,
    pub title: String,
    pub url: String,
    pub verdict: Choice,
    pub reason: String,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct NewsFeedResponse {
    pub items: Vec<NewsItemPublic>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_before_id: Option<i64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn choice_as_str_pizdato() {
        assert_eq!(Choice::Pizdato.as_str(), "pizdato");
    }

    #[test]
    fn choice_as_str_huyevo() {
        assert_eq!(Choice::Huyevo.as_str(), "huyevo");
    }

    #[test]
    fn choice_parse_pizdato() {
        assert_eq!(Choice::parse("pizdato"), Some(Choice::Pizdato));
    }

    #[test]
    fn choice_parse_huyevo() {
        assert_eq!(Choice::parse("huyevo"), Some(Choice::Huyevo));
    }

    #[test]
    fn choice_parse_unknown() {
        assert_eq!(Choice::parse("unknown"), None);
    }

    #[test]
    fn choice_parse_empty() {
        assert_eq!(Choice::parse(""), None);
    }

    #[test]
    fn choice_parse_case_sensitive() {
        assert_eq!(Choice::parse("Pizdato"), None);
    }

    #[test]
    fn choice_serde_roundtrip_pizdato() {
        let c = Choice::Pizdato;
        let json = serde_json::to_string(&c).unwrap();
        assert_eq!(json, "\"pizdato\"");
        let back: Choice = serde_json::from_str(&json).unwrap();
        assert_eq!(back, Choice::Pizdato);
    }

    #[test]
    fn choice_serde_roundtrip_huyevo() {
        let c = Choice::Huyevo;
        let json = serde_json::to_string(&c).unwrap();
        assert_eq!(json, "\"huyevo\"");
        let back: Choice = serde_json::from_str(&json).unwrap();
        assert_eq!(back, Choice::Huyevo);
    }

    #[test]
    fn choice_serde_rejects_invalid() {
        let result: Result<Choice, _> = serde_json::from_str("\"invalid\"");
        assert!(result.is_err());
    }
}
