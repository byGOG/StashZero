use serde::{Deserialize, Serialize};
use std::time::Duration;

const RELEASES_API: &str = "https://api.github.com/repos/byGOG/StashZero/releases/latest";
const USER_AGENT: &str = concat!("StashZero/", env!("CARGO_PKG_VERSION"));
const REQUEST_TIMEOUT: Duration = Duration::from_secs(8);

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseInfo {
    pub version: String,
    pub name: Option<String>,
    pub notes: String,
    pub url: String,
    pub published_at: Option<String>,
}

#[tauri::command]
pub async fn check_for_update() -> Result<ReleaseInfo, String> {
    let client = reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .user_agent(USER_AGENT)
        .build()
        .map_err(|e| format!("HTTP istemcisi başlatılamadı: {e}"))?;

    let response = client
        .get(RELEASES_API)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Ağ hatası: {e}"))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("GitHub API yanıtı: HTTP {}", status.as_u16()));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Yanıt çözümlenemedi: {e}"))?;

    parse_release(&json).ok_or_else(|| "Yanıt beklenen alanları içermiyor".to_string())
}

fn parse_release(json: &serde_json::Value) -> Option<ReleaseInfo> {
    let version = json
        .get("tag_name")
        .and_then(|v| v.as_str())
        .or_else(|| json.get("name").and_then(|v| v.as_str()))?
        .to_string();
    let name = json.get("name").and_then(|v| v.as_str()).map(String::from);
    let notes = json
        .get("body")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let url = json
        .get("html_url")
        .and_then(|v| v.as_str())
        .unwrap_or("https://github.com/byGOG/StashZero/releases/latest")
        .to_string();
    let published_at = json
        .get("published_at")
        .and_then(|v| v.as_str())
        .map(String::from);

    Some(ReleaseInfo {
        version,
        name,
        notes,
        url,
        published_at,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parse_release_extracts_all_fields() {
        let payload = json!({
            "tag_name": "v0.4.0",
            "name": "StashZero v0.4.0",
            "body": "release notes",
            "html_url": "https://github.com/byGOG/StashZero/releases/tag/v0.4.0",
            "published_at": "2026-04-01T12:00:00Z",
        });
        let info = parse_release(&payload).unwrap();
        assert_eq!(info.version, "v0.4.0");
        assert_eq!(info.name.as_deref(), Some("StashZero v0.4.0"));
        assert_eq!(info.notes, "release notes");
        assert!(info.url.ends_with("v0.4.0"));
        assert_eq!(info.published_at.as_deref(), Some("2026-04-01T12:00:00Z"));
    }

    #[test]
    fn parse_release_falls_back_to_name_when_tag_missing() {
        let payload = json!({ "name": "0.4.0", "body": "" });
        let info = parse_release(&payload).unwrap();
        assert_eq!(info.version, "0.4.0");
        assert!(info.url.contains("releases/latest"));
    }

    #[test]
    fn parse_release_returns_none_without_version_fields() {
        let payload = json!({ "body": "no version here" });
        assert!(parse_release(&payload).is_none());
    }

    #[test]
    fn parse_release_handles_missing_optional_fields() {
        let payload = json!({ "tag_name": "v1.0.0" });
        let info = parse_release(&payload).unwrap();
        assert_eq!(info.version, "v1.0.0");
        assert_eq!(info.notes, "");
        assert!(info.published_at.is_none());
    }
}
