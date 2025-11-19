use std::env;

use tauri::command;
use std::fs;
use dirs;

/// Get the system's temporary directory
#[command]
pub fn get_temp_dir() -> String {
    let temp_dir = env::temp_dir();
    temp_dir.to_string_lossy().to_string()
}

/// Create a directory if it doesn't exist
#[command]
pub fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create directory {}: {}", path, e))?;
    Ok(())
}

/// Get the system's downloads directory
#[command]
pub fn get_downloads_dir() -> String {
    dirs::download_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap())
        .to_string_lossy()
        .to_string()
}
