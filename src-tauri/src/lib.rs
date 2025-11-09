use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use sha2::{Sha256, Digest};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let tray_menu = tauri::menu::MenuBuilder::new(app)
                .item(&tauri::menu::MenuItemBuilder::new("显示/隐藏")
                    .id("toggle")
                    .build(app)
                    .unwrap())
                .separator()
                .item(&tauri::menu::MenuItemBuilder::new("退出")
                    .id("quit")
                    .build(app)
                    .unwrap())
                .build(app)
                .unwrap();

            let tray = tauri::tray::TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("GAGA Client")
                .build(app)
                .unwrap();

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "toggle" => {
                    let window = app.get_webview_window("main").unwrap();
                    if window.is_visible().unwrap() {
                        window.hide().unwrap();
                    } else {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            exec_download_command,
            exec_merge_command,
            check_tool_available,
            get_tool_path,
            get_system_info,
            hash_string
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 获取工具路径（内部函数）
fn get_tool_path_internal(tool_name: &str) -> PathBuf {
  // 获取应用资源目录
  let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
  path.pop(); // 从 src-tauri 回到 client
  path.push("bin");
  path.push(tool_name);

  // 调试：打印路径
  eprintln!("工具路径: {:?}", path);
  eprintln!("工具是否存在: {}", path.exists());

  path
}

/// 获取工具路径（Tauri 命令）
#[tauri::command]
async fn get_tool_path(tool_name: String) -> Result<String, String> {
  let path = get_tool_path_internal(&tool_name);
  Ok(path.to_string_lossy().to_string())
}

/// 执行下载命令（N_m3u8DL-RE）
#[tauri::command]
async fn exec_download_command(
  _command: String,
  args: Vec<String>,
) -> Result<String, String> {
  let tool_path = get_tool_path_internal("N_m3u8DL-RE");

  // 检查工具是否存在
  if !tool_path.exists() {
    return Err(format!("工具不存在: {:?}", tool_path));
  }

  // 使用同步 Command 在后台线程中执行，避免阻塞
  let tool_path_str = tool_path.to_string_lossy().to_string();

  // 调试：打印命令和参数
  eprintln!("执行命令: {}", tool_path_str);
  eprintln!("参数数量: {}", args.len());
  for (i, arg) in args.iter().enumerate() {
    if arg.starts_with("--key") && i + 1 < args.len() {
      eprintln!("密钥参数: {} {}", arg, args[i + 1]);
    } else if !arg.starts_with("--key") {
      eprintln!("参数[{}]: {}", i, arg);
    }
  }

  let (output, stderr_output, status) = tokio::task::spawn_blocking(move || {
    let mut cmd = Command::new(&tool_path_str);

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

    // 在后台线程中读取输出，避免阻塞
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

    let stderr_handle = if let Some(stderr) = stderr {
      Some(std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        let mut stderr_output = String::new();
        for line in reader.lines() {
          if let Ok(line) = line {
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

  // 检查退出码
  match status.code() {
    Some(code) if code == 0 => Ok(output),
    Some(code) => Err(format!("命令执行失败，退出码: {}\n标准输出: {}\n错误输出: {}",
      code, output, stderr_output)),
    None => {
      // 退出码为 None 通常表示进程被信号终止
      // 但可能下载已经完成，检查输出中是否有成功信息
      if output.contains("完成") || output.contains("100%") {
        Ok(output)
      } else {
        Err(format!("命令被中断（可能是超时或被终止）\n标准输出: {}\n错误输出: {}",
          output, stderr_output))
      }
    }
  }
}

/// 执行混流命令（ffmpeg）
#[tauri::command]
async fn exec_merge_command(
  _command: String,
  args: Vec<String>,
) -> Result<String, String> {
  // ffmpeg 通常需要系统安装，先尝试本地，再尝试系统
  let tool_path = get_tool_path_internal("ffmpeg");
  let tool_path_str = if tool_path.exists() {
    tool_path.to_string_lossy().to_string()
  } else {
    "ffmpeg".to_string()
  };

  // 调试：打印命令和参数
  eprintln!("执行 ffmpeg 命令: {}", tool_path_str);
  eprintln!("参数数量: {}", args.len());
  for (i, arg) in args.iter().enumerate() {
    eprintln!("参数[{}]: {}", i, arg);
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
          // 实时输出到stderr（用于调试）
          eprintln!("ffmpeg stdout: {}", line);
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
            // 实时输出到stderr（用于调试）
            eprintln!("ffmpeg stderr: {}", line);
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
    Ok(output)
  } else {
    Err(format!("命令执行失败，退出码: {:?}\n标准输出: {}\n错误输出: {}",
      status.code(), output, stderr_output))
  }
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

/// 获取系统信息用于生成设备ID
#[tauri::command]
async fn get_system_info() -> Result<serde_json::Value, String> {
  // 简化版本，只获取基本信息
  let hostname = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "unknown".to_string());
  
  // 获取当前用户名
  let username = std::env::var("USERNAME").unwrap_or_else(|_| "user".to_string());
  
  // 使用简单的硬件标识
  let cpu_id = format!("{}_{}", hostname, username);
  let board_serial = cpu_id.clone();
  let disk_serial = cpu_id.clone();
  let mac_address = "00:00:00:00:00:00".to_string();

  let info = serde_json::json!({
    "hostname": hostname,
    "cpu_id": cpu_id,
    "board_serial": board_serial,
    "disk_serial": disk_serial,
    "mac_address": mac_address
  });

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
