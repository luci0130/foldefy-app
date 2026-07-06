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
    // Truncated output (e.g. the model ran out of tokens): close whatever
    // structures are still open and retry.
    if let Some(repaired) = repair_truncated_json(trimmed) {
        if let Ok(value) = serde_json::from_str(&repaired) {
            return Ok(value);
        }
    }
    Err(FoldefyError::Ai(format!(
        "Model did not return valid JSON. Raw output: {}",
        &trimmed[..trimmed.len().min(400)]
    )))
}

/// Best-effort repair of JSON cut off mid-generation: walk the text
/// string-aware, cut back to the last cleanly finished value, drop a
/// trailing comma and close every still-open bracket.
fn repair_truncated_json(text: &str) -> Option<String> {
    let start = text.find('{')?;
    let body = &text[start..];

    let mut stack_len = 0usize;
    let mut in_string = false;
    let mut escaped = false;
    // Byte index just past the last completed VALUE + the stack depth there
    let mut last_clean_end = 0usize;
    let mut clean_stack_len = 0usize;
    // A closed string is only a clean point if it turns out to be a value,
    // not a key (i.e. it is not followed by ':').
    let mut pending_string: Option<(usize, usize)> = None;

    for (i, ch) in body.char_indices() {
        if escaped {
            escaped = false;
            continue;
        }
        if in_string {
            match ch {
                '\\' => escaped = true,
                '"' => {
                    in_string = false;
                    pending_string = Some((i + 1, stack_len));
                }
                _ => {}
            }
            continue;
        }
        match ch {
            '"' => {
                in_string = true;
                pending_string = None;
            }
            ':' => pending_string = None, // previous string was a key
            ' ' | '\t' | '\n' | '\r' => {}
            _ => {
                if let Some((end, len)) = pending_string.take() {
                    last_clean_end = end;
                    clean_stack_len = len;
                }
                match ch {
                    '{' | '[' => stack_len += 1,
                    '}' | ']' => {
                        stack_len = stack_len.saturating_sub(1);
                        last_clean_end = i + 1;
                        clean_stack_len = stack_len;
                    }
                    _ => {}
                }
            }
        }
    }
    if let Some((end, len)) = pending_string {
        last_clean_end = end;
        clean_stack_len = len;
    }

    if last_clean_end == 0 || clean_stack_len == 0 {
        return None;
    }

    let mut repaired = body[..last_clean_end].trim_end().to_string();
    if repaired.ends_with(',') {
        repaired.pop();
    }
    // Rebuild the closers for the structures still open at the clean point
    let mut reopen: Vec<char> = Vec::new();
    let mut in_s = false;
    let mut esc = false;
    for ch in repaired.chars() {
        if esc {
            esc = false;
            continue;
        }
        match ch {
            '\\' if in_s => esc = true,
            '"' => in_s = !in_s,
            '{' if !in_s => reopen.push('}'),
            '[' if !in_s => reopen.push(']'),
            '}' | ']' if !in_s => {
                reopen.pop();
            }
            _ => {}
        }
    }
    while let Some(closer) = reopen.pop() {
        repaired.push(closer);
    }
    Some(repaired)
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

    #[test]
    fn repairs_truncated_json() {
        // Cut mid-value, like a model running out of tokens
        let truncated = r#"{ "structure": [ { "name": "Proiecte", "children": [ { "name": "Client", "description": "Proiecte pentru clien"#;
        let value = parse_json_lenient(truncated).unwrap();
        assert_eq!(value["structure"][0]["name"], "Proiecte");
        assert_eq!(value["structure"][0]["children"][0]["name"], "Client");

        // Cut right after a comma
        let truncated2 = r#"{ "a": [ { "b": 1 }, "#;
        let value2 = parse_json_lenient(truncated2).unwrap();
        assert_eq!(value2["a"][0]["b"], 1);
    }
}
