use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use sha2::{Sha256, Digest};
use tauri::{Manager, Emitter, menu::{MenuBuilder, MenuItemBuilder}, tray::{TrayIconBuilder, TrayIconEvent}};
use tauri::path::BaseDirectory;
use serde::{Serialize, Deserialize};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

// 引入工具模块
mod utils;
mod logger;

// ==================== 数据结构定义 ====================

/// 日志事件结构
#[derive(Serialize, Clone)]
struct LogEvent {
    level: String,
    message: String,
    progress: Option<f64>,
    speed: Option<String>,
    timestamp: String,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SubtitleStyle {
    fontsize: Option<u32>,
    primary_colour: Option<String>,
    outline: Option<f32>,
    outline_colour: Option<String>,
    shadow: Option<f32>,
    back_colour: Option<String>,
}

/// N_m3u8DL-RE 允许的参数白名单
const ALLOWED_ARGS: &[&str] = &[
    // 基础参数
    "--save-dir", "--save-name", "--thread-count", "--auto-select",
    "--no-log", "--max-speed", "--live-record-limit",
    
    // 内容选择参数
    "--select-video", "--select-audio", "--select-subtitle",
    "--drop-video", "--drop-audio", "--drop-subtitle",
    
    // 解密相关参数
    "--key", "--custom-hls-method", "--decryption-key",
    "--decryption-engine", "--decryption-binary-path", "--mp4-real-time-decryption",
    
    // 混流相关参数
    "--mux-after-done", "--binary-merge",
    
    // HTTP 相关参数
    "-H", "--http-header", "--user-agent", "--referer",
    
    // 高级参数
    "--custom-range", "--date-range", "--append-user-agent",
    "--log-level", "--tmp-dir", "--del-after-done",
    
    // 重试和超时参数
    "--retry-count", "--download-retry-delay", "--auto-subtitle-fix",
    
    // 显示和输出控制参数
    "--no-ansi-color", "--no-date-info", "--no-log-color",
    "--use-shaka-packager", "--check-segments-count",
];

// 工具路径缓存
static TOOL_PATHS: Lazy<Mutex<HashMap<String, PathBuf>>> = Lazy::new(|| Mutex::new(HashMap::new()));

// ==================== 安全验证函数 ====================

/// 验证路径安全性，防止路径遍历攻击
fn validate_path_safety(path: &str) -> Result<(), String> {
    if path.contains("..") {
        return Err("路径包含不安全的父目录引用".to_string());
    }
    
    // Windows 路径分隔符检查
    #[cfg(windows)]
    if path.contains("/") && !path.starts_with("http") {
        return Err("路径包含不安全的分隔符".to_string());
    }
    
    Ok(())
}

/// 验证 N_m3u8DL-RE 命令参数
fn validate_n_m3u8dl_args(args: &[String]) -> Result<(), String> {
    let mut i = 0;
    while i < args.len() {
        let arg = &args[i];
        
        // 跳过 URL 参数（第一个参数通常是 URL）
        if i == 0 && (arg.starts_with("http://") || arg.starts_with("https://")) {
            i += 1;
            continue;
        }
        
        // 检查参数是否在白名单中
        if arg.starts_with("--") || arg.starts_with("-") {
            let arg_name = if arg.starts_with("--") {
                arg.split('=').next().unwrap_or(arg)
            } else {
                arg
            };
            
            if !ALLOWED_ARGS.contains(&arg_name) {
                return Err(format!("不允许的参数: {}", arg_name));
            }
            
            // 检查路径参数的安全性
            if (arg_name == "--save-dir" || arg_name == "--save-name" || arg_name == "--tmp-dir") 
                && i + 1 < args.len() {
                let value = &args[i + 1];
                validate_path_safety(value)?;
            }
            
            // 检查密钥参数格式
            if arg_name == "--key" && i + 1 < args.len() {
                let key_value = &args[i + 1];
                // 密钥格式: KID:KEY 或 0x开头的十六进制
                if !key_value.contains(':') && !key_value.starts_with("0x") {
                    return Err("密钥格式不正确，应为 KID:KEY 或 0x 开头的十六进制".to_string());
                }
            }
        }
        
        i += 1;
    }
    Ok(())
}

/// 验证工具路径
fn validate_tool_path(path: &Path) -> bool {
    path.exists() && 
    path.is_file() && 
    path.parent().map_or(false, |p| p.ends_with("bin"))
}

// ==================== 日志解析函数 ====================

/// 解析 N_m3u8DL-RE 日志行
fn parse_n_m3u8dl_log_line(line: &str, last_progress: &Arc<Mutex<i32>>) -> Option<LogEvent> {
    let timestamp = chrono::Utc::now().to_rfc3339();
    let trimmed = line.trim();
    
    // 跳过空行
    if trimmed.is_empty() {
        return None;
    }
    
    // 跳过只包含进度条的行
    if trimmed.chars().all(|c| c == '━' || c == ' ' || c == '-' || c == '%' || c.is_numeric() || c == '.' || c == ':') {
        return None;
    }
    
    // 跳过所有字幕流信息（Sub xxx）
    if trimmed.starts_with("Sub ") {
        return None;
    }
    
    // 跳过音频流进度（Aud xxx）
    if trimmed.starts_with("Aud ") {
        return None;
    }
    
    // 错误信息（最高优先级）
    if trimmed.contains("ERROR") || trimmed.contains("Error") || 
       trimmed.contains("错误") || trimmed.contains("失败") ||
       trimmed.contains("Permission denied") || trimmed.contains("exception") {
        return Some(LogEvent {
            level: "ERROR".to_string(),
            message: trimmed.to_string(),
            progress: None,
            speed: None,
            timestamp,
        });
    }
    
    // 跳过大部分警告（只保留真正的错误）
    if trimmed.contains("WARN") || trimmed.contains("Warning") {
        return None;
    }
    
    // 解析视频流进度（Vid 1920x1080 | 4300 Kbps）
    if trimmed.starts_with("Vid ") && trimmed.contains("%") {
        if let Some(progress) = extract_progress_from_line(trimmed) {
            // 为了减少日志频率，我们只在进度跨越 5% 边界或达到 100% 时记录日志
            let progress_int = progress.floor() as i32;
            let mut last_progress_guard = last_progress.lock().unwrap();

            if progress_int > *last_progress_guard {
                if (progress_int / 5 > *last_progress_guard / 5) || progress_int == 100 {
                    *last_progress_guard = progress_int;
                    let speed = extract_speed_from_line(trimmed);
                    return Some(LogEvent {
                        level: "INFO".to_string(),
                        message: format!("下载进度: {:.0}%", progress),
                        progress: Some(progress),
                        speed: if !speed.is_empty() { Some(speed) } else { None },
                        timestamp,
                    });
                }
            }
        }
        return None;
    }
    
    // 只记录关键的 INFO 消息
    if trimmed.contains("INFO") {
        if trimmed.contains("Loading URL") {
            return Some(LogEvent {
                level: "INFO".to_string(),
                message: "正在加载视频信息...".to_string(),
                progress: None,
                speed: None,
                timestamp,
            });
        } else if trimmed.contains("Start downloading") {
            return Some(LogEvent {
                level: "INFO".to_string(),
                message: "开始下载...".to_string(),
                progress: Some(0.0),
                speed: None,
                timestamp,
            });
        } else if trimmed.contains("Binary merging") {
            return Some(LogEvent {
                level: "INFO".to_string(),
                message: "正在合并文件...".to_string(),
                progress: None,
                speed: None,
                timestamp,
            });
        } else if trimmed.contains("Decrypting") {
            return Some(LogEvent {
                level: "INFO".to_string(),
                message: "正在解密...".to_string(),
                progress: None,
                speed: None,
                timestamp,
            });
        } else if trimmed.contains("Done") || trimmed.contains("完成") {
            return Some(LogEvent {
                level: "INFO".to_string(),
                message: "下载完成！".to_string(),
                progress: Some(100.0),
                speed: None,
                timestamp,
            });
        }
    }
    
    None
}

/// 从日志行提取进度
fn extract_progress_from_line(line: &str) -> Option<f64> {
    // 尝试匹配百分比
    if let Some(percent_idx) = line.find('%') {
        let before_percent = &line[..percent_idx];
        // 从后往前找数字
        if let Some(num_start) = before_percent.rfind(|c: char| !c.is_numeric() && c != '.') {
            if let Ok(progress) = before_percent[num_start + 1..].trim().parse::<f64>() {
                return Some(progress);
            }
        }
    }
    None
}

/// 从日志行提取速度
fn extract_speed_from_line(line: &str) -> String {
    // 匹配速度格式：1.97MBps, 19.20MBps, 7.81MBps 等
    if let Some(speed_idx) = line.find("Bps") {
        let before_speed = &line[..speed_idx];
        // 从后往前找空格或其他分隔符
        if let Some(start) = before_speed.rfind(|c: char| c.is_whitespace()) {
            let speed_str = &before_speed[start + 1..];
            return format!("{}Bps", speed_str.trim());
        }
    }
    
    // 备用：查找常见速度单位
    for unit in &["MBps", "KBps", "GBps", "MB/s", "KB/s", "GB/s"] {
        if let Some(idx) = line.find(unit) {
            let before = &line[..idx];
            if let Some(start) = before.rfind(|c: char| c.is_whitespace()) {
                return format!("{}{}", before[start + 1..].trim(), unit);
            }
        }
    }
    
    String::new()
}

// ==================== 主程序 ====================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new()
            .level(log::LevelFilter::Info)
            .build())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            // 初始化日志系统
            if let Ok(app_data_dir) = app.path().app_data_dir() {
                // println!("[Debug] App Data Directory: {:?}", app_data_dir);
                if let Err(e) = logger::init_log_file(app_data_dir) {
                    eprintln!("初始化日志系统失败: {}", e);
                }
            }
            
            // 设置窗口图标和标题
            window.set_title("GAGA Client").unwrap();
            
            // 创建托盘菜单
            let show_item = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "退出").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&show_item, &quit_item])
                .build()?;
            
            // 创建系统托盘
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("GAGA Client")
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            
            // 窗口关闭时最小化到托盘而不是退出
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window_clone.hide();
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_tool_path,
            exec_download_command,
            exec_ffmpeg_command,
            exec_merge_command,
            check_tool_available,
            get_system_info,
            hash_string,
            burn_subtitle,
            utils::get_temp_dir,
            utils::get_downloads_dir,
            utils::create_dir,
            list_log_files,
            read_log_file,
            cleanup_old_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 获取工具路径（内部函数，带缓存）
fn get_tool_path_internal(tool_name: &str) -> PathBuf {
  // 先检查缓存
  {
    let cache = TOOL_PATHS.lock().unwrap();
    if let Some(cached_path) = cache.get(tool_name) {
      return cached_path.clone();
    }
  }
  
  // 获取应用资源目录
  let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
  path.pop(); // 从 src-tauri 回到 client
  path.push("bin");
  
  // 根据操作系统添加可执行文件扩展名
  #[cfg(windows)]
  let tool_name_with_ext = if tool_name.ends_with(".exe") {
    tool_name.to_string()
  } else {
    format!("{}.exe", tool_name)
  };
  
  #[cfg(not(windows))]
  let tool_name_with_ext = tool_name.to_string();
  
  path.push(&tool_name_with_ext);

  // 验证路径安全性
  if !validate_tool_path(&path) {
    log::warn!("工具路径验证失败: {:?}", path);
  }

  // 调试：打印路径
  log::info!("工具路径: {:?}", path);
  log::info!("工具是否存在: {}", path.exists());

  // 缓存路径
  {
    let mut cache = TOOL_PATHS.lock().unwrap();
    cache.insert(tool_name.to_string(), path.clone());
  }

  path
}

/// 获取工具路径（Tauri 命令）
#[tauri::command]
async fn get_tool_path(tool_name: String) -> Result<String, String> {
  let path = get_tool_path_internal(&tool_name);
  Ok(path.to_string_lossy().to_string())
}

/// 执行下载命令（N_m3u8DL-RE）- 带参数验证和实时日志
#[tauri::command]
async fn exec_download_command(
  window: tauri::Window,
  _command: String,
  args: Vec<String>,
  working_dir: Option<String>,
) -> Result<String, String> {
  // 参数验证
  if args.is_empty() {
    return Err("参数不能为空".to_string());
  }
  
  // 验证参数安全性
  validate_n_m3u8dl_args(&args)?;
  
  let tool_path = resolve_tool_path(&window.app_handle(), "N_m3u8DL-RE");

  // 检查工具是否存在
  if !tool_path.exists() {
    return Err(format!("工具不存在: {:?}", tool_path));
  }

  // 使用同步 Command 在后台线程中执行，避免阻塞
  let tool_path_str = tool_path.to_string_lossy().to_string();

  // 日志：打印命令和参数
  log::info!("执行命令: {}", tool_path_str);
  log::info!("参数数量: {}", args.len());
  
  // 写入日志文件
  let _ = logger::write_tool_log("N_m3u8DL-RE", "INFO", 
      &format!("开始执行下载命令，参数数量: {}", args.len()));
  
  for (i, arg) in args.iter().enumerate() {
    if arg.starts_with("--key") && i + 1 < args.len() {
      log::debug!("密钥参数: {} [已隐藏]", arg);
    } else {
      log::debug!("参数[{}]: {}", i, arg);
      let _ = logger::write_tool_log("N_m3u8DL-RE", "DEBUG", 
          &format!("参数[{}]: {}", i, arg));
    }
  }

  let last_progress = Arc::new(Mutex::new(-1));
  let last_message = Arc::new(Mutex::new(String::new()));
  let window_clone = window.clone();
  let working_dir_clone = working_dir.clone();
  let (output, stderr_output, status) = tokio::task::spawn_blocking(move || {
    let mut cmd = Command::new(&tool_path_str);
    
    if let Some(dir) = working_dir_clone {
      cmd.current_dir(dir);
    }

    // 添加参数
    for arg in args {
      cmd.arg(arg);
    }

    // 设置输出
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    // 执行命令
    let mut child = cmd.spawn().map_err(|e| {
      format!("执行命令失败: {}，工具路径: {:?}", e, tool_path_str)
    })?;

    // 获取stdout和stderr句柄
    let stdout = child.stdout.take().ok_or("无法获取标准输出")?;
    let stderr = child.stderr.take();

    // 在后台线程中读取输出，避免阻塞，并实时发送日志事件
    let window_for_stdout = window_clone.clone();
    let last_progress_stdout = Arc::clone(&last_progress);
    let last_message_stdout = Arc::clone(&last_message);
    let stdout_handle = std::thread::spawn(move || {
      let reader = BufReader::new(stdout);
      let mut output = String::new();
      for line in reader.lines() {
        if let Ok(line) = line {
          if let Some(log_event) = parse_n_m3u8dl_log_line(&line, &last_progress_stdout) {
            let key = format!("{}:{:?}", log_event.message, log_event.progress);
            let mut lm = last_message_stdout.lock().unwrap();
            if *lm != key {
              *lm = key.clone();
              let _ = logger::write_tool_log("N_m3u8DL-RE", &log_event.level, &log_event.message);
              let _ = window_for_stdout.emit("n-m3u8dl-log", log_event);
            }
          }
          output.push_str(&line);
          output.push('\n');
        }
      }
      output
    });

    let window_for_stderr = window_clone.clone();
    let last_progress_stderr = Arc::clone(&last_progress);
    let last_message_stderr = Arc::clone(&last_message);
    let stderr_handle = if let Some(stderr) = stderr {
      Some(std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        let mut stderr_output = String::new();
        for line in reader.lines() {
          if let Ok(line) = line {
            if let Some(log_event) = parse_n_m3u8dl_log_line(&line, &last_progress_stderr) {
              let key = format!("{}:{:?}", log_event.message, log_event.progress);
              let mut lm = last_message_stderr.lock().unwrap();
              if *lm != key {
                *lm = key.clone();
                let _ = logger::write_tool_log("N_m3u8DL-RE", &log_event.level, &log_event.message);
                let _ = window_for_stderr.emit("n-m3u8dl-log", log_event);
              }
            }
            stderr_output.push_str(&line);
            stderr_output.push('\n');
          }
        }
        stderr_output
      }))
    } else {
      None
    };

    // 等待进程完成
    let status = child.wait().map_err(|e| format!("等待命令完成失败: {}", e))?;

    // 等待输出读取完成
    let output = stdout_handle.join().map_err(|_| "读取标准输出失败")?;
    let stderr_output = stderr_handle.map(|h| h.join().unwrap_or_default()).unwrap_or_default();

    Ok::<(String, String, std::process::ExitStatus), String>((output, stderr_output, status))
  }).await.map_err(|e| format!("执行任务失败: {}", e))??;

  // 发送完成事件
  let complete_event = LogEvent {
    level: if status.success() { "INFO".to_string() } else { "ERROR".to_string() },
    message: if status.success() { "下载任务完成".to_string() } else { "下载任务失败".to_string() },
    progress: if status.success() { Some(100.0) } else { None },
    speed: None,
    timestamp: chrono::Utc::now().to_rfc3339(),
  };
  let _ = window.emit("n-m3u8dl-log", complete_event);

  // 检查退出码
  match status.code() {
    Some(code) if code == 0 => {
      log::info!("命令执行成功");
      let _ = logger::write_tool_log("N_m3u8DL-RE", "INFO", "下载任务执行成功");
      Ok(output)
    },
    Some(code) => {
      log::error!("命令执行失败，退出码: {}", code);
      let _ = logger::write_tool_log("N_m3u8DL-RE", "ERROR", 
          &format!("下载任务执行失败，退出码: {}", code));
      Err(format!("命令执行失败，退出码: {}\n标准输出: {}\n错误输出: {}",
        code, output, stderr_output))
    },
    None => {
      // 退出码为 None 通常表示进程被信号终止
      // 但可能下载已经完成，检查输出中是否有成功信息
      if output.contains("完成") || output.contains("100%") || output.contains("Done") {
        log::info!("命令执行完成（无退出码）");
        let _ = logger::write_tool_log("N_m3u8DL-RE", "INFO", "下载任务执行完成（无退出码）");
        Ok(output)
      } else {
        log::error!("命令被中断");
        let _ = logger::write_tool_log("N_m3u8DL-RE", "ERROR", "下载任务被中断");
        Err(format!("命令被中断（可能是超时或被终止）\n标准输出: {}\n错误输出: {}",
          output, stderr_output))
      }
    }
  }
}

/// 执行混流命令（ffmpeg）
#[tauri::command]
async fn exec_merge_command(
  app: tauri::AppHandle,
  _command: String,
  args: Vec<String>,
) -> Result<String, String> {
  // 参数验证
  if args.is_empty() {
    return Err("参数不能为空".to_string());
  }
  
  // ffmpeg 通常需要系统安装，先尝试资源目录，再尝试系统
  let tool_path = resolve_tool_path(&app, "ffmpeg");
  let tool_path_str = if tool_path.exists() {
    tool_path.to_string_lossy().to_string()
  } else {
    "ffmpeg".to_string()
  };

  // 日志：打印命令和参数
  log::info!("执行 ffmpeg 命令: {}", tool_path_str);
  log::info!("参数数量: {}", args.len());
  
  // 写入日志文件
  let _ = logger::write_tool_log("ffmpeg", "INFO", 
      &format!("开始执行混流命令，参数数量: {}", args.len()));
  
  for (i, arg) in args.iter().enumerate() {
    log::debug!("参数[{}]: {}", i, arg);
    let _ = logger::write_tool_log("ffmpeg", "DEBUG", 
        &format!("参数[{}]: {}", i, arg));
  }

  let (output, stderr_output, status) = tokio::task::spawn_blocking(move || {
    let mut cmd = Command::new(&tool_path_str);

    for arg in args {
      cmd.arg(arg);
    }

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("执行命令失败: {}", e))?;

    // 获取stdout和stderr句柄
    let stdout = child.stdout.take().ok_or("无法获取标准输出")?;
    let stderr = child.stderr.take();

    // 在后台线程中读取输出，避免阻塞
    let stdout_handle = std::thread::spawn(move || {
      let reader = BufReader::new(stdout);
      let mut output = String::new();
      for line in reader.lines() {
        if let Ok(line) = line {
          // 使用结构化日志
          log::debug!("ffmpeg stdout: {}", line);
          // 写入日志文件
          let _ = logger::write_tool_log("ffmpeg", "INFO", &line);
          output.push_str(&line);
          output.push('\n');
        }
      }
      output
    });

    let stderr_handle = if let Some(stderr) = stderr {
      Some(std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        let mut stderr_output = String::new();
        for line in reader.lines() {
          if let Ok(line) = line {
            // 使用结构化日志
            log::debug!("ffmpeg stderr: {}", line);
            // 写入日志文件（ffmpeg 的进度信息在 stderr）
            let _ = logger::write_tool_log("ffmpeg", "INFO", &line);
            stderr_output.push_str(&line);
            stderr_output.push('\n');
          }
        }
        stderr_output
      }))
    } else {
      None
    };

    // 等待进程完成
    let status = child.wait().map_err(|e| format!("等待命令完成失败: {}", e))?;

    // 等待输出读取完成
    let output = stdout_handle.join().map_err(|_| "读取标准输出失败")?;
    let stderr_output = stderr_handle.map(|h| h.join().unwrap_or_default()).unwrap_or_default();

    Ok::<(String, String, std::process::ExitStatus), String>((output, stderr_output, status))
  }).await.map_err(|e| format!("执行任务失败: {}", e))??;

  if status.success() {
    log::info!("ffmpeg 命令执行成功");
    let _ = logger::write_tool_log("ffmpeg", "INFO", "混流命令执行成功");
    Ok(output)
  } else {
    log::error!("ffmpeg 命令执行失败，退出码: {:?}", status.code());
    let _ = logger::write_tool_log("ffmpeg", "ERROR", 
        &format!("混流命令执行失败，退出码: {:?}", status.code()));
    Err(format!("命令执行失败，退出码: {:?}\n标准输出: {}\n错误输出: {}",
      status.code(), output, stderr_output))
  }
}

#[tauri::command]
async fn exec_ffmpeg_command(app: tauri::AppHandle, args: Vec<String>) -> Result<String, String> {
  exec_merge_command(app, "ffmpeg".to_string(), args).await
}

/// 检查工具是否可用
#[tauri::command]
async fn check_tool_available(tool_name: String) -> Result<bool, String> {
  // 先检查本地工具
  let local_path = get_tool_path_internal(&tool_name);
  if local_path.exists() {
    return Ok(true);
  }

  // 如果本地没有，检查系统 PATH
  #[cfg(unix)]
  let check_cmd = "which";
  #[cfg(windows)]
  let check_cmd = "where";

  let output = Command::new(check_cmd)
    .arg(&tool_name)
    .output()
    .map_err(|e| format!("检查工具失败: {}", e))?;

  Ok(output.status.success())
}

/// 获取系统信息用于生成设备ID（跨平台支持）
#[tauri::command]
async fn get_system_info() -> Result<serde_json::Value, String> {
  // 跨平台获取主机名
  let hostname = gethostname::gethostname()
    .to_string_lossy()
    .to_string();
  
  // 跨平台获取用户名
  let username = std::env::var("USER")
    .or_else(|_| std::env::var("USERNAME"))
    .unwrap_or_else(|_| "user".to_string());
  
  // 使用 sysinfo 获取系统信息
  let mut sys = sysinfo::System::new_all();
  sys.refresh_all();
  
  // 获取 CPU 信息
  let cpu_brand = sys.cpus().first()
    .map(|cpu| cpu.brand().to_string())
    .unwrap_or_else(|| "unknown".to_string());
  
  // 获取总内存
  let total_memory = sys.total_memory();
  
  // 获取操作系统信息
  let os_name = sysinfo::System::name().unwrap_or_else(|| "unknown".to_string());
  let os_version = sysinfo::System::os_version().unwrap_or_else(|| "unknown".to_string());
  
  // 生成设备标识
  let cpu_id = format!("{}_{}", hostname, cpu_brand);
  let board_serial = format!("{}_{}_{}", hostname, username, total_memory);
  let disk_serial = format!("{}_{}", os_name, os_version);
  let mac_address = "00:00:00:00:00:00".to_string(); // 简化处理

  let info = serde_json::json!({
    "hostname": hostname,
    "username": username,
    "cpu_id": cpu_id,
    "cpu_brand": cpu_brand,
    "board_serial": board_serial,
    "disk_serial": disk_serial,
    "mac_address": mac_address,
    "total_memory": total_memory,
    "os_name": os_name,
    "os_version": os_version
  });

  log::info!("系统信息已获取: {}", hostname);
  Ok(info)
}

/// 字符串哈希函数
#[tauri::command]
async fn hash_string(input: String) -> Result<String, String> {
  let mut hasher = Sha256::new();
  hasher.update(input.as_bytes());
  let result = hasher.finalize();
  Ok(format!("{:x}", result))
}

/// 检测可用的硬件加速编码器
fn detect_hardware_encoder() -> String {
  #[cfg(target_os = "macos")]
  {
    // macOS 使用 VideoToolbox
    "h264_videotoolbox".to_string()
  }
  
  #[cfg(target_os = "windows")]
  {
    // Windows 优先尝试 NVIDIA NVENC，然后是 Intel QSV
    // 这里简化处理，实际应该检测硬件
    use std::process::Command;
    
    // 检测 NVIDIA GPU
    let nvidia_check = Command::new("ffmpeg")
      .args(&["-hide_banner", "-encoders"])
      .output();
    
    if let Ok(output) = nvidia_check {
      let encoders = String::from_utf8_lossy(&output.stdout);
      if encoders.contains("h264_nvenc") {
        return "h264_nvenc".to_string();
      } else if encoders.contains("h264_qsv") {
        return "h264_qsv".to_string();
      }
    }
    
    // 降级到软件编码
    "libx264".to_string()
  }
  
  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  {
    // Linux 等其他平台使用软件编码
    "libx264".to_string()
  }
}

/// 烧录字幕到视频（硬字幕）
#[tauri::command]
async fn burn_subtitle(
  window: tauri::Window,
  video_path: String,
  subtitle_path: String,
  output_path: String,
  style: Option<SubtitleStyle>,
) -> Result<String, String> {
  log::info!("开始烧录字幕");
  log::info!("视频路径: {}", video_path);
  log::info!("字幕路径: {}", subtitle_path);
  log::info!("输出路径: {}", output_path);
  
  // 验证路径安全性
  validate_path_safety(&video_path)?;
  validate_path_safety(&subtitle_path)?;
  validate_path_safety(&output_path)?;
  
  // 检测硬件加速编码器
  let encoder = detect_hardware_encoder();
  log::info!("使用编码器: {}", encoder);
  // 通知前端编码器选择
  let _ = window.emit("burn-subtitle-status", LogEvent {
    level: "INFO".to_string(),
    message: format!(
      "字幕烧录开始，编码器: {}{}",
      encoder,
      if encoder != "libx264" { "（硬件）" } else { "（软件）" }
    ),
    progress: None,
    speed: None,
    timestamp: chrono::Utc::now().to_rfc3339(),
  });
  
  // 获取 ffmpeg 路径（资源目录优先）
  let ffmpeg_path = resolve_tool_path(&window.app_handle(), "ffmpeg");
  
  // 构建 ffmpeg 命令
  // 字幕文件路径需要转义（Windows 路径中的反斜杠）
  let style_merged = {
    let s = style.clone().unwrap_or(SubtitleStyle {
      fontsize: Some(72),
      primary_colour: Some("&H00FFFFFF".to_string()),
      outline: Some(2.0),
      outline_colour: Some("&H00000000".to_string()),
      shadow: Some(3.0),
      back_colour: Some("&H60000000".to_string()),
    });
    let mut parts: Vec<String> = Vec::new();
    if let Some(v) = s.fontsize { parts.push(format!("Fontsize={}", v)); }
    if let Some(v) = s.primary_colour { parts.push(format!("PrimaryColour={}", v)); }
    if let Some(v) = s.outline { parts.push(format!("Outline={}", v)); }
    if let Some(v) = s.outline_colour { parts.push(format!("OutlineColour={}", v)); }
    if let Some(v) = s.shadow { parts.push(format!("Shadow={}", v)); }
    if let Some(v) = s.back_colour { parts.push(format!("BackColour={}", v)); }
    parts.join(",")
  };
  let subtitle_filter = if cfg!(target_os = "windows") {
    format!("subtitles='{}':force_style='{}'", subtitle_path.replace("\\", "\\\\").replace(":", "\\:"), style_merged)
  } else {
    format!("subtitles='{}':force_style='{}'", subtitle_path.replace("'", "\\'"), style_merged)
  };
  
  let mut args = vec![
    "-i".to_string(),
    video_path.clone(),
    "-vf".to_string(),
    subtitle_filter,
    "-c:v".to_string(),
    encoder.clone(),
  ];
  
  // 根据编码器添加特定参数
  if encoder == "h264_videotoolbox" {
    // macOS VideoToolbox 参数
    args.extend(vec![
      "-b:v".to_string(),
      "4M".to_string(),  // 4Mbps 码率
      "-maxrate".to_string(),
      "8M".to_string(),
      "-bufsize".to_string(),
      "10M".to_string(),
    ]);
  } else if encoder == "h264_nvenc" {
    // NVIDIA NVENC 参数
    args.extend(vec![
      "-preset".to_string(),
      "p4".to_string(),  // 平衡质量和速度
      "-b:v".to_string(),
      "4M".to_string(),
    ]);
  } else if encoder == "h264_qsv" {
    // Intel QSV 参数
    args.extend(vec![
      "-preset".to_string(),
      "medium".to_string(),
      "-b:v".to_string(),
      "4M".to_string(),
    ]);
  } else {
    // 软件编码参数
    args.extend(vec![
      "-preset".to_string(),
      "medium".to_string(),
      "-crf".to_string(),
      "23".to_string(),
    ]);
  }
  
  // 音频直接复制，不重新编码
  args.extend(vec![
    "-c:a".to_string(),
    "copy".to_string(),
    "-y".to_string(),
    output_path.clone(),
  ]);
  
  log::info!("ffmpeg 参数: {:?}", args);
  
  let window_clone = window.clone();
  let (output, stderr_output, status) = tokio::task::spawn_blocking(move || {
    let mut cmd = Command::new(&ffmpeg_path);
    cmd.args(&args);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    
    let mut child = cmd.spawn().map_err(|e| {
      format!("执行 ffmpeg 失败: {}", e)
    })?;
    
    let stdout = child.stdout.take().ok_or("无法获取标准输出")?;
    let stderr = child.stderr.take();
    
    // 读取 stdout
    let stdout_handle = std::thread::spawn(move || {
      let reader = BufReader::new(stdout);
      let mut output = String::new();
      for line in reader.lines() {
        if let Ok(line) = line {
          output.push_str(&line);
          output.push('\n');
        }
      }
      output
    });
    
    // 读取 stderr（ffmpeg 的进度信息在 stderr）
    let window_for_stderr = window_clone.clone();
    let stderr_handle = if let Some(stderr) = stderr {
      Some(std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        let mut stderr_output = String::new();
        for line in reader.lines() {
          if let Ok(line) = line {
            // 解析 ffmpeg 进度
            if line.contains("time=") {
              // 发送进度事件
              let _ = window_for_stderr.emit("burn-subtitle-progress", line.clone());
            }
            stderr_output.push_str(&line);
            stderr_output.push('\n');
          }
        }
        stderr_output
      }))
    } else {
      None
    };
    
    let status = child.wait().map_err(|e| format!("等待命令完成失败: {}", e))?;
    let output = stdout_handle.join().map_err(|_| "读取标准输出失败")?;
    let stderr_output = stderr_handle.map(|h| h.join().unwrap_or_default()).unwrap_or_default();
    
    Ok::<(String, String, std::process::ExitStatus), String>((output, stderr_output, status))
  }).await.map_err(|e| format!("执行任务失败: {}", e))??;
  
  if status.success() {
    log::info!("字幕烧录成功");
    let _ = window.emit("burn-subtitle-status", LogEvent {
      level: "INFO".to_string(),
      message: format!("字幕烧录成功（编码器: {}）", encoder),
      progress: None,
      speed: None,
      timestamp: chrono::Utc::now().to_rfc3339(),
    });
    Ok(format!("字幕烧录完成: {}", output_path))
  } else {
    log::error!("字幕烧录失败，退出码: {:?}", status.code());
    // 如果是硬件编码器，尝试回退到软件编码
    if encoder != "libx264" {
      let _ = window.emit("burn-subtitle-status", LogEvent {
        level: "WARN".to_string(),
        message: format!("硬件编码失败，回退到软件编码 libx264"),
        progress: None,
        speed: None,
        timestamp: chrono::Utc::now().to_rfc3339(),
      });

      // 重新构建软件编码参数
      let ffmpeg_path_fb = resolve_tool_path(&window.app_handle(), "ffmpeg");
      let subtitle_filter_fb = if cfg!(target_os = "windows") {
        format!("subtitles='{}'", subtitle_path.replace("\\", "\\\\").replace(":", "\\:"))
      } else {
        format!("subtitles='{}'", subtitle_path.replace("'", "\\'"))
      };
      let args_fb = vec![
        "-i".to_string(),
        video_path.clone(),
        "-vf".to_string(),
        subtitle_filter_fb,
        "-c:v".to_string(),
        "libx264".to_string(),
        "-preset".to_string(),
        "medium".to_string(),
        "-crf".to_string(),
        "23".to_string(),
        "-c:a".to_string(),
        "copy".to_string(),
        "-y".to_string(),
        output_path.clone(),
      ];

      let window_clone_fb = window.clone();
      let (output_fb, stderr_output_fb, status_fb) = tokio::task::spawn_blocking(move || {
        let mut cmd = Command::new(&ffmpeg_path_fb);
        cmd.args(&args_fb);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| {
          format!("执行 ffmpeg 失败（回退）: {}", e)
        })?;

        let stdout = child.stdout.take().ok_or("无法获取标准输出")?;
        let stderr = child.stderr.take();

        let stdout_handle = std::thread::spawn(move || {
          let reader = BufReader::new(stdout);
          let mut output = String::new();
          for line in reader.lines() {
            if let Ok(line) = line {
              output.push_str(&line);
              output.push('\n');
            }
          }
          output
        });

        let window_for_stderr = window_clone_fb.clone();
        let stderr_handle = if let Some(stderr) = stderr {
          Some(std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            let mut stderr_output = String::new();
            for line in reader.lines() {
              if let Ok(line) = line {
                if line.contains("time=") {
                  let _ = window_for_stderr.emit("burn-subtitle-progress", line.clone());
                }
                stderr_output.push_str(&line);
                stderr_output.push('\n');
              }
            }
            stderr_output
          }))
        } else {
          None
        };

        let status = child.wait().map_err(|e| format!("等待命令完成失败: {}", e))?;
        let output = stdout_handle.join().map_err(|_| "读取标准输出失败")?;
        let stderr_output = stderr_handle.map(|h| h.join().unwrap_or_default()).unwrap_or_default();

        Ok::<(String, String, std::process::ExitStatus), String>((output, stderr_output, status))
      }).await.map_err(|e| format!("执行任务失败（回退）: {}", e))??;

      if status_fb.success() {
        let _ = window.emit("burn-subtitle-status", LogEvent {
          level: "INFO".to_string(),
          message: "字幕烧录成功（已回退到软件编码 libx264）".to_string(),
          progress: None,
          speed: None,
          timestamp: chrono::Utc::now().to_rfc3339(),
        });
        return Ok(format!("字幕烧录完成: {}", output_path));
      } else {
        let _ = window.emit("burn-subtitle-status", LogEvent {
          level: "ERROR".to_string(),
          message: "字幕烧录失败（硬件与回退均失败）".to_string(),
          progress: None,
          speed: None,
          timestamp: chrono::Utc::now().to_rfc3339(),
        });
        return Err(format!(
          "字幕烧录失败（硬件与回退均失败）\n标准输出: {}\n错误输出: {}\n回退标准输出: {}\n回退错误输出: {}",
          output, stderr_output, output_fb, stderr_output_fb
        ));
      }
    } else {
      let _ = window.emit("burn-subtitle-status", LogEvent {
        level: "ERROR".to_string(),
        message: "字幕烧录失败".to_string(),
        progress: None,
        speed: None,
        timestamp: chrono::Utc::now().to_rfc3339(),
      });
      Err(format!("字幕烧录失败\n标准输出: {}\n错误输出: {}", output, stderr_output))
    }
  }
}

// ==================== 日志管理命令 ====================

/// 列出所有日志文件
#[tauri::command]
async fn list_log_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;
    
    let log_files = logger::list_log_files(app_data_dir)?;
    Ok(log_files.iter()
        .filter_map(|p| p.to_str().map(|s| s.to_string()))
        .collect())
}

/// 读取日志文件内容
#[tauri::command]
async fn read_log_file(file_path: String, max_lines: Option<usize>) -> Result<String, String> {
    logger::read_log_file(PathBuf::from(file_path), max_lines)
}

/// 清理旧日志文件
#[tauri::command]
async fn cleanup_old_logs(app: tauri::AppHandle, keep_days: u32) -> Result<usize, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;
    
    logger::cleanup_old_logs(app_data_dir, keep_days)
}
/// 通过资源目录解析工具路径（优先使用打包后的资源目录）
fn resolve_tool_path(handle: &tauri::AppHandle, tool_name: &str) -> PathBuf {
    // 根据操作系统添加可执行文件扩展名
    #[cfg(windows)]
    let tool_name_with_ext = if tool_name.ends_with(".exe") {
        tool_name.to_string()
    } else {
        format!("{}.exe", tool_name)
    };

    #[cfg(not(windows))]
    let tool_name_with_ext = tool_name.to_string();

    // 资源目录中的路径，注意：使用 ../bin 以匹配 tauri.conf.json 的资源打包规则
    let resource_path = handle
        .path()
        .resolve(&format!("../bin/{}", tool_name_with_ext), BaseDirectory::Resource);

    if let Ok(p) = resource_path {
        if validate_tool_path(&p) {
            return p;
        }
    }

    // 回退到编译期路径（开发模式）
    get_tool_path_internal(tool_name)
}
