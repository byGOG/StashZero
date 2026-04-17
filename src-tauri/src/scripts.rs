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
            &format!("Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command','{}' -Verb RunAs -WindowStyle Hidden", escaped_script)
        ])
        .spawn()
        .map_err(|e| {
            log::error!("Betik başlatılamadı: {}", e);
            format!("Betik başlatılamadı: {}", e)
        })?;
    Ok(())
}

#[tauri::command]
pub async fn run_shell_script_logged(window: TauriWindow, script: String, shell_type: String) -> Result<(), String> {
    let shell_name = if shell_type.to_lowercase() == "cmd" { "CMD" } else { "PowerShell" };
    log::info!("İnteraktif {} oturumu başlatılıyor", shell_name);
    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("İnteraktif {} oturumu başlatılıyor", shell_name), "log_type": "info" }));
    
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

    let mut cmd = if shell_type.to_lowercase() == "cmd" {
        let mut c = tokio::process::Command::new("cmd.exe");
        c.creation_flags(CREATE_NO_WINDOW);
        c.args(["/C", "chcp 65001 > nul && cmd /D /Q"]);
        c
    } else {
        let mut c = tokio::process::Command::new("powershell.exe");
        c.creation_flags(CREATE_NO_WINDOW);
        c.args([
            "-NoProfile",
            "-NoLogo",
            "-NoExit",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            &script,
        ]);
        c
    };

    let mut child = cmd.stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| {
            log::error!("İnteraktif {} başlatılamadı: {}", shell_name, e);
            format!("{} başlatılamadı: {}", shell_name, e)
        })?;

    // Store stdin for interactive input
    let mut stdin = child.stdin.take().ok_or("Stdin alınamadı")?;

    if let Some(stdout) = child.stdout.take() {
        let w = window.clone();
        tokio::spawn(async move {
            use tokio::io::AsyncReadExt;
            let mut reader = stdout;
            let mut buffer = Vec::new();
            let mut last_emit = std::time::Instant::now();

            loop {
                let mut chunk = [0u8; 1024];
                let timeout = tokio::time::sleep(tokio::time::Duration::from_millis(30));
                
                tokio::select! {
                    res = reader.read(&mut chunk) => {
                        match res {
                            Ok(0) => break,
                            Ok(n) => {
                                buffer.extend_from_slice(&chunk[..n]);
                                if buffer.contains(&b'\n') || buffer.len() > 1024 {
                                    let msg = String::from_utf8_lossy(&buffer).to_string();
                                    let _ = w.emit("script-log", serde_json::json!({ "msg": msg, "log_type": "process" }));
                                    buffer.clear();
                                    last_emit = std::time::Instant::now();
                                }
                            }
                            Err(_) => break,
                        }
                    }
                    _ = timeout => {
                        if !buffer.is_empty() && last_emit.elapsed().as_millis() > 20 {
                            let msg = String::from_utf8_lossy(&buffer).to_string();
                            let _ = w.emit("script-log", serde_json::json!({ "msg": msg, "log_type": "process" }));
                            buffer.clear();
                            last_emit = std::time::Instant::now();
                        }
                    }
                }
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        let w = window.clone();
        tokio::spawn(async move {
            use tokio::io::AsyncReadExt;
            let mut reader = stderr;
            let mut buffer = Vec::new();
            loop {
                let mut chunk = [0u8; 1024];
                let timeout = tokio::time::sleep(tokio::time::Duration::from_millis(50));
                tokio::select! {
                    res = reader.read(&mut chunk) => {
                        match res {
                            Ok(0) => break,
                            Ok(n) => {
                                buffer.extend_from_slice(&chunk[..n]);
                                if buffer.contains(&b'\n') {
                                    let msg = String::from_utf8_lossy(&buffer).to_string();
                                    let _ = w.emit("script-log", serde_json::json!({ "msg": msg, "log_type": "error" }));
                                    buffer.clear();
                                }
                            }
                            Err(_) => break,
                        }
                    }
                    _ = timeout => {
                        if !buffer.is_empty() {
                            let msg = String::from_utf8_lossy(&buffer).to_string();
                            let _ = w.emit("script-log", serde_json::json!({ "msg": msg, "log_type": "error" }));
                            buffer.clear();
                        }
                    }
                }
            }
        });
    }

    // If CMD, send the script via stdin manually to avoid pipe races with /K
    // DO THIS AFTER READERS ARE STARTED
    if shell_type.to_lowercase() == "cmd" && !script.is_empty() {
        stdin.write_all(format!("{}\n", script).as_bytes()).await.ok();
        stdin.flush().await.ok();
    }

    {
        let mut guard = SCRIPT_STDIN.lock().await;
        *guard = Some(stdin);
    }

    let _ = window.emit("script-log", serde_json::json!({ "msg": format!("İnteraktif {} oturumu başlatıldı.", shell_name), "log_type": "success", "session_active": true }));

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
pub async fn ensure_terminal_session(window: tauri::Window, shell_type: String) -> Result<(), String> {
    let child_guard = SCRIPT_CHILD.lock().await;
    if child_guard.is_some() {
        // TODO: check if existing shell matches requested shell_type?
        // For now, just return Ok if any session is active.
        return Ok(());
    }
    drop(child_guard);
    
    let init_msg = if shell_type.to_lowercase() == "cmd" {
        ""
    } else {
        "$OutputEncoding = [System.Text.Encoding]::UTF8; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Console]::InputEncoding = [System.Text.Encoding]::UTF8; Write-Host 'StashZero PowerShell Hazır.' -ForegroundColor Cyan"
    };

    run_shell_script_logged(window, init_msg.to_string(), shell_type).await
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
pub async fn kill_script(window: tauri::Window) -> Result<(), String> {
    let mut child_guard = SCRIPT_CHILD.lock().await;
    if let Some(mut c) = child_guard.take() {
        let _ = c.kill().await;
    }
    let mut stdin_guard = SCRIPT_STDIN.lock().await;
    *stdin_guard = None;
    let _ = window.emit("script-log", serde_json::json!({ "msg": "Oturum sonlandırıldı.", "log_type": "info", "session_active": false }));
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
#[tauri::command]
pub async fn open_uac_settings() -> Result<(), String> {
    std::process::Command::new("UserAccountControlSettings.exe")
        .spawn()
        .map_err(|e| format!("UAC Ayarları açılamadı: {}", e))?;
    Ok(())
}
#[tauri::command]
pub async fn open_defender_settings() -> Result<(), String> {
    std::process::Command::new("cmd")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["/C", "start ms-settings:windowsdefender"])
        .spawn()
        .map_err(|e| format!("Defender Ayarları açılamadı: {}", e))?;
    Ok(())
}
#[tauri::command]
pub async fn set_uac_level(level: i32) -> Result<(), String> {
    let (cpba, posd) = match level {
        0 => (0, 0),
        1 => (5, 0),
        2 => (5, 1),
        3 => (2, 1),
        _ => return Err("Geçersiz UAC seviyesi".to_string()),
    };

    let script = format!(
        "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' -Name 'ConsentPromptBehaviorAdmin' -Value {}; \
         Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' -Name 'PromptOnSecureDesktop' -Value {}",
        cpba, posd
    );

    std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-NoProfile",
            "-Command",
            &format!("Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command','{}' -Verb RunAs -WindowStyle Hidden", script.replace("'", "''"))
        ])
        .spawn()
        .map_err(|e| format!("UAC güncellenemedi: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn set_windows_theme(dark: bool) -> Result<(), String> {
    let val = if dark { 0 } else { 1 };
    
    let script = format!(
        "$p = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize'; \
         Set-ItemProperty -Path $p -Name AppsUseLightTheme -Value {v}; \
         Set-ItemProperty -Path $p -Name SystemUsesLightTheme -Value {v}; \
         $code = '[DllImport(\\\"user32.dll\\\")] public static extern int SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult)'; \
         Add-Type -MemberDefinition $code -Name Win32 -Namespace Native; \
         $res = [IntPtr]::Zero; \
         [Native.Win32]::SendMessageTimeout([IntPtr]0xffff, 0x001A, [IntPtr]::Zero, 'WM_SETTINGCHANGE', 0x0002, 1000, [out] $res); \
         Stop-Process -Name explorer -Force; Start-Process explorer",
        v = val
    );

    std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script])
        .spawn()
        .map_err(|e| format!("Tema değiştirilemedi: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn set_desktop_icon_visibility(icon_type: String, visible: bool) -> Result<(), String> {
    let clsid = match icon_type.as_str() {
        "computer" => "{20D04FE0-3AEA-1069-A2D8-08002B30309D}",
        "recycle_bin" => "{645FF040-5081-101B-9F08-00AA002F954E}",
        "user_files" => "{59031a47-3f72-44a7-89c5-5595fe6b30ee}",
        "network" => "{F02C1A0D-BE21-4350-88B0-7367FC96EF3C}",
        "control_panel" => "{5399E694-6CE5-4D6C-8FCE-1D8870FDCBA0}",
        _ => return Err("Geçersiz ikon tipi".to_string()),
    };

    let val = if visible { 0 } else { 1 };
    let script = format!(
        "$v = {v}; \
         $clsid = '{clsid}'; \
         $path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel'; \
         if (-not (Test-Path $path)) {{ New-Item -Path $path -Force | Out-Null }}; \
         Set-ItemProperty -Path $path -Name $clsid -Value $v -Type DWord; \
         $code = '[DllImport(\"shell32.dll\")] public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);'; \
         Add-Type -MemberDefinition $code -Namespace Win32 -Name Shell32; \
         [Win32.Shell32]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)",
        v = val,
        clsid = clsid
    );

    const CREATE_NO_WINDOW: u32 = 0x08000000;
    std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script])
        .spawn()
        .map_err(|e| format!("İkon durumu değiştirilemedi: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn open_desktop_icon_settings() -> Result<(), String> {
    std::process::Command::new("control")
        .args(["desk.cpl,,5"])
        .spawn()
        .map_err(|e| format!("Masaüstü simge ayarları açılamadı: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn open_power_settings() -> Result<(), String> {
    std::process::Command::new("control")
        .args(["powercfg.cpl"])
        .spawn()
        .map_err(|e| format!("Güç ayarları açılamadı: {}", e))?;
    Ok(())
}

