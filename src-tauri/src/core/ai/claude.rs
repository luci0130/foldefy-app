use super::provider::{AiProvider, JsonRequest};
use crate::error::FoldefyError;
use async_trait::async_trait;

const MODEL: &str = "claude-opus-4-8";

pub struct ClaudeProvider {
    api_key: String,
}

impl ClaudeProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

#[async_trait]
impl AiProvider for ClaudeProvider {
    async fn complete_json(
        &self,
        request: &JsonRequest,
    ) -> Result<serde_json::Value, FoldefyError> {
        let client = reqwest::Client::new();
        let response = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&serde_json::json!({
                "model": MODEL,
                "max_tokens": request.max_tokens,
                "system": request.system,
                "messages": [{ "role": "user", "content": request.prompt }],
            }))
            .send()
            .await
            .map_err(|e| FoldefyError::Ai(format!("API request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(FoldefyError::Ai(format!(
                "API error ({}): {}",
                status, body
            )));
        }

        let body: serde_json::Value = response
            .json()
            .await
            .map_err(|e| FoldefyError::Ai(format!("Failed to parse API response: {}", e)))?;

        let content = body["content"]
            .as_array()
            .and_then(|arr| arr.iter().find(|block| block["type"] == "text"))
            .and_then(|block| block["text"].as_str())
            .ok_or_else(|| FoldefyError::Ai("Failed to extract text from API response".into()))?;

        parse_json_lenient(content)
    }
}

/// Parse model output as JSON, tolerating markdown code fences.
pub fn parse_json_lenient(text: &str) -> Result<serde_json::Value, FoldefyError> {
    let trimmed = text.trim();
    if let Ok(value) = serde_json::from_str(trimmed) {
        return Ok(value);
    }
    // Strip ```json ... ``` fences or grab the outermost {...} span
    let inner = trimmed
        .strip_prefix("```json")
        .or_else(|| trimmed.strip_prefix("```"))
        .and_then(|s| s.strip_suffix("```"))
        .map(str::trim);
    if let Some(inner) = inner {
        if let Ok(value) = serde_json::from_str(inner) {
            return Ok(value);
        }
    }
    if let (Some(start), Some(end)) = (trimmed.find('{'), trimmed.rfind('}')) {
        if start < end {
            if let Ok(value) = serde_json::from_str(&trimmed[start..=end]) {
                return Ok(value);
            }
        }
    }
    Err(FoldefyError::Ai(format!(
        "Model did not return valid JSON. Raw output: {}",
        &trimmed[..trimmed.len().min(400)]
    )))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lenient_parser_handles_fences_and_prose() {
        assert!(parse_json_lenient("{\"a\": 1}").is_ok());
        assert!(parse_json_lenient("```json\n{\"a\": 1}\n```").is_ok());
        assert!(parse_json_lenient("Here you go: {\"a\": 1} hope it helps").is_ok());
        assert!(parse_json_lenient("no json here").is_err());
    }
}
