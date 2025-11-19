use std::fs::{File, OpenOptions};
use std::io::{Write};
use std::path::PathBuf;
use std::sync::Mutex;
use chrono::Local;
use once_cell::sync::Lazy;

/// 日志文件路径缓存
static LOG_FILE_PATH: Lazy<Mutex<Option<PathBuf>>> = Lazy::new(|| Mutex::new(None));

/// 初始化日志文件路径
pub fn init_log_file(app_data_dir: PathBuf) -> Result<(), String> {
    let logs_dir = app_data_dir.join("logs");
    std::fs::create_dir_all(&logs_dir)
        .map_err(|e| format!("创建日志目录失败: {}", e))?;
    
    let log_file = logs_dir.join(format!("gaga-client_{}.log", 
        Local::now().format("%Y-%m-%d")));
    
    *LOG_FILE_PATH.lock().unwrap() = Some(log_file.clone());
    
    // 写入初始日志
    write_log("INFO", "日志系统初始化", None)?;
    
    Ok(())
}

/// 写入日志到文件
pub fn write_log(level: &str, message: &str, tool: Option<&str>) -> Result<(), String> {
    let log_path = LOG_FILE_PATH.lock().unwrap();
    let log_file = match log_path.as_ref() {
        Some(path) => path.clone(),
        None => return Ok(()), // 如果日志文件未初始化，静默失败
    };
    drop(log_path);
    
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .map_err(|e| format!("打开日志文件失败: {}", e))?;
    
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let tool_prefix = tool.map(|t| format!("[{}] ", t)).unwrap_or_default();
    let log_line = format!("[{}] [{}] {}{}\n", timestamp, level, tool_prefix, message);
    
    file.write_all(log_line.as_bytes())
        .map_err(|e| format!("写入日志失败: {}", e))?;
    
    file.flush()
        .map_err(|e| format!("刷新日志文件失败: {}", e))?;
    
    Ok(())
}

/// 写入工具日志（带工具名称）
pub fn write_tool_log(tool_name: &str, level: &str, message: &str) -> Result<(), String> {
    write_log(level, message, Some(tool_name))
}


/// 获取所有日志文件列表
pub fn list_log_files(app_data_dir: PathBuf) -> Result<Vec<PathBuf>, String> {
    let logs_dir = app_data_dir.join("logs");
    
    if !logs_dir.exists() {
        return Ok(vec![]);
    }
    
    let entries = std::fs::read_dir(&logs_dir)
        .map_err(|e| format!("读取日志目录失败: {}", e))?;
    
    let mut log_files = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("log") {
                log_files.push(path);
            }
        }
    }
    
    log_files.sort_by(|a, b| {
        b.file_name().cmp(&a.file_name()) // 最新的在前
    });
    
    Ok(log_files)
}

/// 读取日志文件内容
pub fn read_log_file(file_path: PathBuf, max_lines: Option<usize>) -> Result<String, String> {
    use std::io::Read;
    
    let mut file = File::open(&file_path)
        .map_err(|e| format!("打开日志文件失败: {}", e))?;
    
    let mut content = String::new();
    file.read_to_string(&mut content)
        .map_err(|e| format!("读取日志文件失败: {}", e))?;
    
    if let Some(max) = max_lines {
        let lines: Vec<&str> = content.lines().collect();
        let start = if lines.len() > max {
            lines.len() - max
        } else {
            0
        };
        content = lines[start..].join("\n");
    }
    
    Ok(content)
}

/// 清理旧日志文件（保留最近 N 天）
pub fn cleanup_old_logs(app_data_dir: PathBuf, keep_days: u32) -> Result<usize, String> {
    let logs_dir = app_data_dir.join("logs");
    
    if !logs_dir.exists() {
        return Ok(0);
    }
    
    let entries = std::fs::read_dir(&logs_dir)
        .map_err(|e| format!("读取日志目录失败: {}", e))?;
    
    let cutoff_date = Local::now().date_naive() - chrono::Duration::days(keep_days as i64);
    let mut deleted_count = 0;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() {
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    // 尝试从文件名提取日期
                    if let Some(date_str) = file_name.strip_prefix("gaga-client_")
                        .and_then(|s| s.strip_suffix(".log")) {
                        if let Ok(file_date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                            if file_date < cutoff_date {
                                if std::fs::remove_file(&path).is_ok() {
                                    deleted_count += 1;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(deleted_count)
}

