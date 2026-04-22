use tauri::{Manager, Window as TauriWindow};
use tauri::Emitter;
use tauri_plugin_notification::NotificationExt;
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn copy_shortcut_to_desktop(source: &str) -> std::io::Result<()> {
    log::info!("Kısayol masaüstüne kopyalanıyor: {}", source);
    let _ = std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-NoProfile",
            "-Command",
            &format!("if (Test-Path '{}') {{ Copy-Item -Path '{}' -Destination \"$HOME\\Desktop\" -Force }}", source, source)
        ])
        .status();
    Ok(())
}

#[tauri::command]
pub async fn uninstall_software(path: String) -> Result<String, String> {
    log::info!("Kaldırma başlatılıyor: {}", path);
    if !std::path::Path::new(&path).exists() {
        log::error!("Kaldırma aracı bulunamadı: {}", path);
        return Err(format!("Kaldırma aracı bulunamadı: {}", path));
    }

    let mut uninstall_cmd = tokio::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-NoProfile",
            "-WindowStyle", "Normal",
            "-Command",
            &format!("$ErrorActionPreference = 'Stop'; Start-Process -FilePath '{}' -Wait -Verb RunAs", path)
        ])
        .spawn()
        .map_err(|e| format!("Kaldırma başlatılamadı: {}", e))?;

    let status = uninstall_cmd.wait().await.map_err(|e| {
        log::error!("Kaldırma process hatası ({}): {}", path, e);
        format!("Kaldırma process error: {}", e)
    })?;

    if status.success() {
        log::info!("Başarıyla kaldırıldı: {}", path);
        Ok("Uygulama başarıyla kaldırıldı.".to_string())
    } else {
        let code = status.code().unwrap_or(-1);
        log::error!("Kaldırma başarısız ({}): Exit code {}", path, code);
        Err(format!("Kaldırma hatası: Exit code {}", code))
    }
}

#[tauri::command]
pub async fn uninstall_portable(url: String, app_name: String, uninstall_paths: Option<Vec<String>>) -> Result<String, String> {
    if let Some(paths) = uninstall_paths {
        log::info!("Özel kaldırma yolları temizleniyor ({}): {:?}", app_name, paths);
        for path_str in paths {
            let path = std::path::Path::new(&path_str);
            if path.exists() {
                if path.is_dir() {
                    let _ = std::fs::remove_dir_all(path);
                } else {
                    let _ = std::fs::remove_file(path);
                }
            }
        }
        return Ok("Uygulama kalıntıları başarıyla temizlendi.".to_string());
    }

    let file_name = url.split('/').last().unwrap_or("app.exe");
    let path = std::path::PathBuf::from("C:\\StashZero").join(file_name);
    let folder_path = std::path::PathBuf::from("C:\\StashZero").join(&app_name);

    if folder_path.exists() {
        std::fs::remove_dir_all(&folder_path).map_err(|e| format!("Klasör silinemedi: {}", e))?;
        Ok("Uygulama klasörü başarıyla silindi.".to_string())
    } else if path.exists() {
        std::fs::remove_file(&path).map_err(|e| format!("Dosya silinemedi: {}", e))?;
        Ok("Uygulama başarıyla silindi.".to_string())
    } else {
        Err(format!("Uygulama bulunamadı: C:\\StashZero\\{}", app_name))
    }
}

#[tauri::command]
pub async fn launch_portable(url: String, app_name: Option<String>, launch_file: Option<String>) -> Result<(), String> {
    let file_name = url.split('/').last().unwrap_or("app.exe");
    let base = std::path::PathBuf::from("C:\\StashZero");
    
    // 1. Precise launch_file check (highest priority)
    if let (Some(name), Some(l_file)) = (&app_name, &launch_file) {
        let full_l_path = base.join(name).join(l_file);
        if full_l_path.exists() {
            std::process::Command::new("powershell")
                .creation_flags(0x08000000)
                .args(["-NoProfile", "-Command", &format!("Start-Process -FilePath '{}' -WorkingDirectory '{}'", full_l_path.to_str().unwrap(), base.join(name).to_str().unwrap())])
                .spawn()
                .map_err(|e| format!("Özel başlatıcı çalıştırılamadı: {}", e))?;
            return Ok(());
        }
    }

    let path = base.join(file_name);
    
    // 2. Folder search logic
    if !path.exists() {
        if let Some(name) = app_name {
            let folder = base.join(&name);
            if folder.exists() {
                let ps_cmd = format!("Get-ChildItem -Path '{}' -Filter *.exe -Recurse | Select-Object -First 1 | Expand-Property FullName", folder.to_str().unwrap());
                let output = std::process::Command::new("powershell")
                    .creation_flags(0x08000000)
                    .args(["-NoProfile", "-Command", &ps_cmd])
                    .output()
                    .map_err(|e| format!("Arama hatası: {}", e))?;
                
                let found_exe = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !found_exe.is_empty() {
                    std::process::Command::new("powershell")
                        .creation_flags(0x08000000)
                        .args(["-NoProfile", "-Command", &format!("Start-Process -FilePath '{}' -WorkingDirectory '{}'", found_exe, folder.to_str().unwrap())])
                        .spawn()
                        .map_err(|e| format!("Başlatılamadı: {}", e))?;
                    return Ok(());
                }
            }
        }
    }

    // 3. Simple file launch
    if path.exists() {
        std::process::Command::new("powershell")
            .creation_flags(0x08000000)
            .args(["-NoProfile", "-Command", &format!("Start-Process -FilePath '{}'", path.to_str().unwrap())])
            .spawn()
            .map_err(|e| format!("Uygulama başlatılamadı: {}", e))?;
        Ok(())
    } else {
        Err("Uygulama bulunamadı.".to_string())
    }
}

#[tauri::command]
pub async fn get_installed_winget_ids() -> Result<Vec<(String, String)>, String> {
    let ps_script = r#"
        $paths = @(
            "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
            "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
        )
        $installed = Get-ItemProperty $paths -ErrorAction SilentlyContinue | 
            Select-Object @{n='name';e={$_.DisplayName}}, @{n='version';e={$_.DisplayVersion}} | 
            Where-Object { $_.name -ne $null -and $_.name -ne '' }
        
        $results = @()
        foreach ($item in $installed) {
            $results += "$($item.name)|$($item.version)"
        }

        if (Test-Path "C:\StashZero") {
            Get-ChildItem "C:\StashZero" -Directory | ForEach-Object {
                $results += "$($_.Name)|Portable"
            }
        }

        # Microsoft Store (UWP) Apps
        Get-AppxPackage | Select-Object @{n='name';e={$_.Name}}, @{n='version';e={$_.Version}} | ForEach-Object {
            if ($_.name -and $_.version) { $results += "$($_.name)|$($_.version)" }
        }

        $results | Select-Object -Unique
    "#;

    let output = tokio::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", ps_script])
        .output()
        .await
        .map_err(|e| format!("Kayıt defteri okunamadı: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut final_list = Vec::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.contains('|') {
            let parts: Vec<&str> = trimmed.split('|').collect();
            final_list.push((parts[0].trim().to_string(), parts[1].trim().to_string()));
        } else if !trimmed.is_empty() {
             final_list.push((trimmed.to_string(), "".to_string()));
        }
    }
    Ok(final_list)
}

#[tauri::command]
pub fn check_path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
pub async fn get_file_version(path: String) -> Result<String, String> {
    if !std::path::Path::new(&path).exists() {
        return Err("Dosya bulunamadı".to_string());
    }

    let ps_script = format!(
        "(Get-Item -Path '{}').VersionInfo.ProductVersion",
        path
    );

    let output = tokio::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", &ps_script])
        .output()
        .await
        .map_err(|e| format!("Sürüm bilgisi alınamadı: {}", e))?;

    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if version.is_empty() {
        Ok("Kurulu".to_string())
    } else {
        Ok(version)
    }
}

#[tauri::command]
pub async fn install_exe_from_url(
    window: TauriWindow, 
    url: String, 
    package_id: String, 
    app_name: String, 
    is_portable: bool, 
    install_args: Option<String>, 
    shortcut_path: Option<String>,
    post_install_cmd: Option<String>
) -> Result<String, String> {
    log::info!("Kurulum başlatılıyor: {} ({})", app_name, package_id);
    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("Kurulum başlatılıyor: {} ({})", app_name, package_id), "log_type": "info" }));
    
    // GitHub 'latest' link resolution
    let mut final_url = url.clone();
    let is_github_latest = url.contains("github.com") && url.contains("releases/latest");
    
    if is_github_latest {
        let _ = window.emit("backend-log", serde_json::json!({ "msg": "GitHub üzerinden en güncel sürüm çözümleniyor...", "log_type": "info" }));
        
        let api_url = url.replace("github.com/", "api.github.com/repos/").replace("/releases/latest", "/releases/latest");
        let output = tokio::process::Command::new("curl")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-s", "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", &api_url])
            .output().await.map_err(|e| format!("GitHub API hatası: {}", e))?;
            
        let json: serde_json::Value = serde_json::from_slice(&output.stdout).map_err(|e| format!("JSON ayrıştırma hatası: {}", e))?;
        let mut found_asset = false;

        if let Some(assets) = json.get("assets").and_then(|a| a.as_array()) {
            let asset = assets.iter().find(|a| {
                let name = a.get("name").and_then(|n| n.as_str()).unwrap_or("");
                name.to_lowercase().ends_with(".exe") && !name.to_lowercase().contains("portable")
            });
            
            if let Some(a) = asset {
                if let Some(download_url) = a.get("browser_download_url").and_then(|u| u.as_str()) {
                    final_url = download_url.to_string();
                    found_asset = true;
                    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("En güncel sürüm bulundu: {}", final_url.split('/').last().unwrap_or("setup.exe")), "log_type": "success" }));
                }
            }
        }

        if !found_asset {
            return Err("GitHub üzerinden kurulum dosyası bulunamadı. Lütfen daha sonra tekrar deneyin.".to_string());
        }
    }

    log::debug!("URL: {}, Portable: {}, Args: {:?}", final_url, is_portable, install_args);
    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("İndirme başlatılıyor: {}", final_url), "log_type": "info" }));

    let _ = window.emit("install-progress", serde_json::json!({
        "package_id": package_id,
        "percentage": 10,
        "message": format!("{} indiriliyor...", app_name)
    }));

    // Extract filename, but handle query strings by falling back to package_id.exe
    let file_name = if final_url.contains('?') || !final_url.split('/').last().unwrap_or("").ends_with(".exe") {
        format!("{}.exe", package_id)
    } else {
        final_url.split('/').last().unwrap_or("setup.exe").to_string()
    };
    let stash_base = std::path::PathBuf::from("C:\\StashZero");
    if !stash_base.exists() {
        std::fs::create_dir_all(&stash_base).map_err(|e| format!("StashZero klasörü oluşturulamadı: {}", e))?;
    }

    let target_path = if is_portable {
        let app_dir = stash_base.join(&app_name);
        if !app_dir.exists() {
            std::fs::create_dir_all(&app_dir).map_err(|e| format!("Uygulama klasörü oluşturulamadı: {}", e))?;
        }
        // If it's a direct EXE, name it using its ID inside its folder (e.g. C:\StashZero\Rufus\rufus.exe)
        if url.ends_with(".exe") {
             app_dir.join(format!("{}.exe", package_id))
        } else {
             app_dir.join(&file_name)
        }
    } else {
        std::env::temp_dir().join(&file_name)
    };

    log::debug!("Dosya indiriliyor: {} -> {}", final_url, target_path.display());
    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("İndirme hedefi: {}", target_path.display()), "log_type": "info" }));

    let mut curl_cmd = tokio::process::Command::new("curl.exe")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-L", "--fail", "--retry", "3", "--retry-delay", "2", "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "-o", target_path.to_str().unwrap(), &final_url])
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| {
            log::error!("curl.exe başlatılamadı: {}", e);
            format!("curl.exe başlatılamadı: {}", e)
        })?;

    if let Some(stderr) = curl_cmd.stderr.take() {
        let window_clone = window.clone();
        let package_id_clone = package_id.clone();
        let app_name_clone = app_name.clone();

        tokio::spawn(async move {
            use tokio::io::AsyncBufReadExt;
            let mut reader = tokio::io::BufReader::new(stderr);
            let mut buffer = Vec::new();
            let mut last_message = String::new();
            
            while let Ok(n) = reader.read_until(b'\r', &mut buffer).await {
                if n == 0 { break; }
                let line = String::from_utf8_lossy(&buffer).to_string();
                buffer.clear();

                let clean_line = line.replace('\r', "").replace('\n', "");
                let parts: Vec<&str> = clean_line.split_whitespace().collect();
                
                if parts.len() >= 7 {
                    if let Ok(pct) = parts[0].parse::<u32>() {
                        let total_size = parts.get(1).unwrap_or(&"");
                        let received = parts.get(3).unwrap_or(&"");
                        let speed = parts.get(6).unwrap_or(&"");
                        
                        if total_size == &"0" && received == &"0" {
                            continue;
                        }

                        let current_message = format!("{} indiriliyor... %{} | Boyut: {} | Alınan: {} | Hız: {}", 
                            app_name_clone, pct, total_size, received, speed);
                        
                        if current_message != last_message {
                            let _ = window_clone.emit("install-progress", serde_json::json!({
                                "package_id": package_id_clone,
                                "percentage": pct,
                                "message": current_message.clone()
                            }));
                            last_message = current_message;
                        }
                    }
                }
            }
        });
    }
    
    let status = curl_cmd.wait().await.map_err(|e| {
        log::error!("curl.exe error: {}", e);
        format!("curl.exe process error: {}", e)
    })?;

    if !status.success() {
        log::error!("İndirme başarısız ({}): Exit code {}", app_name, status.code().unwrap_or(-1));
        return Err(format!("İndirme başarısız (HTTP hatası veya bağlantı kesildi): Exit code {}", status.code().unwrap_or(-1)));
    }

    // Check file size and existence
    let metadata = std::fs::metadata(&target_path).map_err(|e| {
        log::error!("İndirilen dosya bulunamadı: {} - {}", target_path.display(), e);
        format!("İndirilen dosya bulunamadı: {}", e)
    })?;

    let size_kb = metadata.len() / 1024;
    log::info!("İndirme tamamlandı: {} (Boyut: {} KB)", app_name, size_kb);
    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("İndirme bitti, dosya boyutu: {} KB", size_kb), "log_type": "info" }));
    
    if metadata.len() < 1024 {
        let _ = std::fs::remove_file(&target_path); // Clean up bad file
        return Err("İndirilen dosya çok küçük (1KB altı), muhtemelen hatalı veya sunucu hatası oluştu.".to_string());
    }

    log::info!("İndirme tamamlandı: {}", app_name);

    let is_zip = final_url.to_lowercase().ends_with(".zip") || file_name.to_lowercase().ends_with(".zip");

    if is_zip {
        let _ = window.emit("install-progress", serde_json::json!({
            "package_id": package_id,
            "percentage": null,
            "message": format!("{} ayıklanıyor...", app_name)
        }));

        let extract_path = if is_portable {
            stash_base.join(&app_name)
        } else {
            // Non-portable zips like SDI also go to C:\StashZero per user request
            // to keep the system root clean but consolidated.
            stash_base.join(&app_name)
        };

        if !extract_path.exists() {
            std::fs::create_dir_all(&extract_path).map_err(|e| format!("Klasör oluşturulamadı: {}", e))?;
        }

        log::info!("Ayıklama başlatılıyor: {}", target_path.display());
        let unzip_cmd = tokio::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args([
                "-NoProfile",
                "-Command",
                &format!("tar -xf '{}' -C '{}'", target_path.to_str().unwrap(), extract_path.to_str().unwrap())
            ])
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| {
                log::error!("Ayıklama başlatılamadı: {}", e);
                format!("Ayıklama başlatılamadı: {}", e)
            })?;

        let output = unzip_cmd.wait_with_output().await.map_err(|e| format!("Ayıklama hatası: {}", e))?;
        if output.status.success() {
            let msg = format!("{} başarıyla C:\\StashZero klasörüne ayıklandı.", app_name);
            if let Some(path) = shortcut_path {
                let _ = copy_shortcut_to_desktop(&path);
            }
            let _ = window.emit("install-progress", serde_json::json!({
                "package_id": package_id,
                "percentage": 100,
                "message": msg.clone()
            }));
            if let Some(cmd) = post_install_cmd {
                log::info!("Kurulum sonrası komut çalıştırılıyor: {}", cmd);
                let _ = std::process::Command::new("powershell")
                    .creation_flags(CREATE_NO_WINDOW)
                    .args(["-NoProfile", "-Command", &cmd])
                    .status();
            }
            return Ok(msg);
        } else {
            let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!("Ayıklama başarısız: {}", if err_msg.is_empty() { "Bilinmeyen PowerShell hatası".to_string() } else { err_msg }));
        }
    }

    if is_portable {
        let msg = format!("{} başarıyla C:\\StashZero klasörüne indirildi.", app_name);
        if let Some(path) = shortcut_path {
            let _ = copy_shortcut_to_desktop(&path);
        }
        let _ = window.emit("install-progress", serde_json::json!({
            "package_id": package_id,
            "percentage": 100,
            "message": msg.clone()
        }));
        return Ok(msg);
    }

    let _ = window.emit("install-progress", serde_json::json!({
        "package_id": package_id,
        "percentage": null,
        "message": format!("{} kuruluyor...", app_name)
    }));

    let target_str = target_path.to_str().unwrap();
    let final_args = install_args.unwrap_or_else(|| "/S".to_string());
    let args_part = if final_args.is_empty() { 
        "".to_string() 
    } else { 
        format!("-ArgumentList '{}'", final_args) 
    };
    
    log::info!("Kurulum başlatılıyor: {} -> Args: {}", target_str, final_args);
    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("Yükleyici çalıştırılıyor: {} {}", target_str, final_args), "log_type": "process" }));

    let mut install_cmd = tokio::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-NoProfile",
            "-WindowStyle", "Hidden",
            "-Command",
            &format!("$ErrorActionPreference = 'Stop'; Start-Process -FilePath '{}' {} -Wait -Verb RunAs", target_str, args_part)
        ])
        .spawn()
        .map_err(|e| {
            log::error!("Kurulum başlatılamadı: {}", e);
            format!("Kurulum başlatılamadı: {}", e)
        })?;

    let install_status = install_cmd.wait().await.map_err(|e| {
        log::error!("Kurulum süreci hatası ({}): {}", app_name, e);
        format!("Kurulum process error: {}", e)
    })?;

    if install_status.success() {
        log::info!("Kurulum başarıyla tamamlandı: {}", app_name);
        
        if let Some(cmd) = post_install_cmd {
            log::info!("Kurulum sonrası komut çalıştırılıyor: {}", cmd);
            let _ = std::process::Command::new("powershell")
                .creation_flags(CREATE_NO_WINDOW)
                .args(["-NoProfile", "-Command", &cmd])
                .status();
        }

        if let Some(path) = shortcut_path {
            let _ = copy_shortcut_to_desktop(&path);
        }
        let _ = window.emit("install-progress", serde_json::json!({
            "package_id": package_id,
            "percentage": 100,
            "message": format!("{} başarıyla kuruldu.", app_name)
        }));
        Ok(format!("{} başarıyla kuruldu.", app_name))
    } else {
        let code = install_status.code().unwrap_or(-1);
        log::error!("Kurulum başarısız ({}): Exit code {}", app_name, code);
        Err(format!("Kurulum hatası: Exit code {}", code))
    }
}
