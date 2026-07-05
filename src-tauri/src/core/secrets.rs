use crate::error::FoldefyError;
use keyring::Entry;

const SERVICE: &str = "foldefy";
const CLAUDE_KEY_USER: &str = "claude_api_key";

/// Read the Claude API key from the OS credential store (Windows Credential
/// Manager). Returns `None` when absent or the store is unavailable.
pub fn get_claude_key() -> Option<String> {
    let entry = Entry::new(SERVICE, CLAUDE_KEY_USER).ok()?;
    entry.get_password().ok().filter(|k| !k.is_empty())
}

/// Store the Claude API key in the OS credential store. An empty key deletes
/// the stored credential.
pub fn set_claude_key(key: &str) -> Result<(), FoldefyError> {
    let entry = Entry::new(SERVICE, CLAUDE_KEY_USER)
        .map_err(|e| FoldefyError::Other(format!("keyring: {e}")))?;

    if key.is_empty() {
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(FoldefyError::Other(format!("keyring: {e}"))),
        }
    } else {
        entry
            .set_password(key)
            .map_err(|e| FoldefyError::Other(format!("keyring: {e}")))
    }
}
