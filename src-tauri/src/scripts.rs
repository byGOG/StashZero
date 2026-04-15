use std::sync::Arc;
use once_cell::sync::Lazy;
use tauri::Window as TauriWindow;
use tauri::Emitter;
use tokio::sync::Mutex as TokioMutex;
use std::os::windows::process::CommandExt;
use tokio::io::AsyncWriteExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

// Global interactive script stdin + child handle
pub static SCRIPT_STDIN: Lazy<Arc<TokioMutex<Option<tokio::process::ChildStdin>>>> = Lazy::new(|| Arc::new(TokioMutex::new(None)));
pub static SCRIPT_CHILD: Lazy<Arc<TokioMutex<Option<tokio::process::Child>>>> = Lazy::new(|| Arc::new(TokioMutex::new(None)));

#[tauri::command]
pub async fn run_ps_script(window: TauriWindow, script: String) -> Result<(), String> {
    log::info!("PowerShell betiği çalıştırılıyor (Gizli Pencere)");
    let _ = window.emit("backend-log", serde_json::json!({ "msg": "PowerShell betiği çalıştırılıyor (Gizli Pencere)", "log_type": "info" }));
    
    log::debug!("Betik içeriği: {}", script);
    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("Betik: {}", script), "log_type": "info" }));
    
    let escaped_script = script.replace("'", "''");
    
    std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-NoProfile",
            "-Command",
            &format!("Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-Command','{}' -Verb RunAs -WindowStyle Hidden", escaped_script)
        ])
        .spawn()
        .map_err(|e| {
            log::error!("Betik başlatılamadı: {}", e);
            format!("Betik başlatılamadı: {}", e)
        })?;
    Ok(())
}

#[tauri::command]
pub async fn run_ps_script_logged(window: TauriWindow, script: String) -> Result<(), String> {
    log::info!("İnteraktif PowerShell oturumu başlatılıyor");
    let _ = window.emit("backend-log", serde_json::json!({ "msg": "İnteraktif PowerShell oturumu başlatılıyor", "log_type": "info" }));
    
    log::debug!("Betik içeriği: {}", script);
    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("Betik: {}", script), "log_type": "info" }));
    
    use tokio::io::AsyncBufReadExt;

    // Kill any existing interactive session
    {
        let mut child_guard = SCRIPT_CHILD.lock().await;
        if let Some(mut old) = child_guard.take() {
            log::debug!("Eski oturum sonlandırılıyor...");
            let _ = old.kill().await;
        }
        let mut stdin_guard = SCRIPT_STDIN.lock().await;
        *stdin_guard = None;
    }

    let mut child = tokio::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-NoProfile",
            "-NoLogo",
            "-NoExit",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &script,
        ])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| {
            log::error!("İnteraktif betik başlatılamadı: {}", e);
            format!("Betik başlatılamadı: {}", e)
        })?;

    // Store stdin for interactive input
    if let Some(stdin) = child.stdin.take() {
        let mut guard = SCRIPT_STDIN.lock().await;
        *guard = Some(stdin);
    }

    let _ = window.emit("script-log", serde_json::json!({ "msg": "İnteraktif oturum başlatıldı.", "log_type": "success", "session_active": true }));

    if let Some(stdout) = child.stdout.take() {
        let w = window.clone();
        tokio::spawn(async move {
            let mut reader = tokio::io::BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                log::debug!("[PS STDOUT] {}", line);
                let _ = w.emit("script-log", serde_json::json!({ "msg": line, "log_type": "process" }));
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        let w = window.clone();
        tokio::spawn(async move {
            let mut reader = tokio::io::BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                if !line.trim().is_empty() {
                    log::error!("[PS STDERR] {}", line);
                    let _ = w.emit("script-log", serde_json::json!({ "msg": line, "log_type": "error" }));
                }
            }
        });
    }

    // Store child and wait in background
    {
        let mut child_guard = SCRIPT_CHILD.lock().await;
        *child_guard = Some(child);
    }

    // Spawn a task to wait for the child to exit
    let w = window.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            let mut guard = SCRIPT_CHILD.lock().await;
            if let Some(ref mut c) = *guard {
                match c.try_wait() {
                    Ok(Some(_status)) => {
                        *guard = None;
                        drop(guard);
                        let mut stdin_guard = SCRIPT_STDIN.lock().await;
                        *stdin_guard = None;
                        let _ = w.emit("script-log", serde_json::json!({ "msg": "Oturum sonlandı.", "log_type": "info", "session_active": false }));
                        break;
                    }
                    Ok(None) => {} // still running
                    Err(_) => break,
                }
            } else {
                break;
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn send_script_input(input: String) -> Result<(), String> {
    log::debug!("Girdi gönderiliyor: {}", input);
    let mut guard = SCRIPT_STDIN.lock().await;
    if let Some(ref mut stdin) = *guard {
        stdin.write_all(format!("{}\n", input).as_bytes()).await
            .map_err(|e| {
                log::error!("Girdi gönderilemedi: {}", e);
                format!("Girdi gönderilemedi: {}", e)
            })?;
        stdin.flush().await.map_err(|e| {
            log::error!("Flush hatası: {}", e);
            format!("Flush hatası: {}", e)
        })?;
        Ok(())
    } else {
        log::warn!("Girdi gönderilmek istendi ama aktif oturum yok.");
        Err("Aktif oturum yok.".to_string())
    }
}

#[tauri::command]
pub async fn kill_script() -> Result<(), String> {
    let mut child_guard = SCRIPT_CHILD.lock().await;
    if let Some(mut c) = child_guard.take() {
        let _ = c.kill().await;
    }
    let mut stdin_guard = SCRIPT_STDIN.lock().await;
    *stdin_guard = None;
    Ok(())
}

#[tauri::command]
pub async fn open_drive(path: String) -> Result<(), String> {
    std::process::Command::new("explorer.exe")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Klasör açılamadı: {}", e))?;
    Ok(())
}
