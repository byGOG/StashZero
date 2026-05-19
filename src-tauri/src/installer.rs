use std::os::windows::process::CommandExt;
use tauri::Emitter;
use tauri::Window as TauriWindow;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn split_windows_args(args: &str) -> Vec<String> {
    let mut parsed = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for ch in args.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            c if c.is_whitespace() && !in_quotes => {
                if !current.is_empty() {
                    parsed.push(std::mem::take(&mut current));
                }
            }
            c => current.push(c),
        }
    }

    if !current.is_empty() {
        parsed.push(current);
    }

    parsed
}

fn powershell_encoded_command_args(script: &str) -> Vec<String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    let script_utf16: Vec<u8> = script
        .encode_utf16()
        .flat_map(|code_unit| code_unit.to_le_bytes())
        .collect();

    vec![
        "-NoProfile".to_string(),
        "-ExecutionPolicy".to_string(),
        "Bypass".to_string(),
        "-WindowStyle".to_string(),
        "Hidden".to_string(),
        "-EncodedCommand".to_string(),
        STANDARD.encode(script_utf16),
    ]
}

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

fn create_desktop_shortcut_fn(target_exe: &str, link_name: &str) -> std::io::Result<()> {
    log::info!(
        "Masaüstü kısayolu oluşturuluyor: {} -> {}",
        link_name,
        target_exe
    );
    let safe_target = target_exe.replace('\'', "''");
    let safe_name = link_name.replace('\'', "''");
    let ps_cmd = format!(
        "$ws=New-Object -ComObject WScript.Shell; $l=$ws.CreateShortcut(\"$HOME\\Desktop\\{}.lnk\"); $l.TargetPath='{}'; $l.WorkingDirectory=Split-Path '{}' -Parent; $l.Save()",
        safe_name, safe_target, safe_target
    );
    let _ = std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", &ps_cmd])
        .status();
    Ok(())
}

fn create_start_menu_shortcut_fn(target_exe: &str, link_name: &str) -> std::io::Result<()> {
    log::info!(
        "Başlat menüsü kısayolu oluşturuluyor: {} -> {}",
        link_name,
        target_exe
    );
    let safe_target = target_exe.replace('\'', "''");
    let safe_name = link_name.replace('\'', "''");
    let ps_cmd = format!(
        "$dir = Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs'; if (-not (Test-Path $dir)) {{ New-Item -ItemType Directory -Path $dir -Force | Out-Null }}; $ws=New-Object -ComObject WScript.Shell; $l=$ws.CreateShortcut((Join-Path $dir '{}.lnk')); $l.TargetPath='{}'; $l.WorkingDirectory=Split-Path '{}' -Parent; $l.Save()",
        safe_name, safe_target, safe_target
    );
    let _ = std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", &ps_cmd])
        .status();
    Ok(())
}

#[tauri::command]
pub async fn uninstall_software(
    path: String,
    uninstall_args: Option<String>,
    uninstall_kill_targets: Option<Vec<String>>,
    uninstall_as_admin: Option<bool>,
) -> Result<String, String> {
    let expanded_path = expand_env_vars(&path);
    log::info!("Kaldırma başlatılıyor: {}", expanded_path);
    if !std::path::Path::new(&expanded_path).exists() {
        log::error!("Kaldırma aracı bulunamadı: {}", expanded_path);
        return Err(format!("Kaldırma aracı bulunamadı: {}", expanded_path));
    }

    let lower_path = expanded_path.to_lowercase();
    let default_args = if lower_path.ends_with(".msi") {
        "/qn /norestart"
    } else if lower_path.contains("\\unins") {
        "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART"
    } else {
        "/S"
    };
    let final_args = uninstall_args.unwrap_or_else(|| default_args.to_string());
    let parsed_args = split_windows_args(&final_args);
    let escaped_path = expanded_path.replace('\'', "''");
    let verb_part = if uninstall_as_admin.unwrap_or(true) {
        " -Verb RunAs"
    } else {
        ""
    };

    let start_process_command = if lower_path.ends_with(".msi") {
        let mut msi_args = vec!["'/x'".to_string(), format!("'{}'", escaped_path)];
        for arg in &parsed_args {
            msi_args.push(format!("'{}'", arg.replace('\'', "''")));
        }
        format!(
            "$p = Start-Process -FilePath 'msiexec.exe' -ArgumentList @({}) -WindowStyle Hidden{} -PassThru",
            msi_args.join(", "),
            verb_part
        )
    } else if final_args.trim().is_empty() {
        format!(
            "$p = Start-Process -FilePath '{}' -WindowStyle Hidden{} -PassThru",
            escaped_path, verb_part
        )
    } else {
        let args = parsed_args
            .iter()
            .map(|arg| format!("'{}'", arg.replace('\'', "''")))
            .collect::<Vec<_>>()
            .join(", ");
        format!(
            "$p = Start-Process -FilePath '{}' -ArgumentList @({}) -WindowStyle Hidden{} -PassThru",
            escaped_path, args, verb_part
        )
    };

    let kill_loop = uninstall_kill_targets
        .as_ref()
        .filter(|targets| !targets.is_empty())
        .map(|targets| {
            let names_csv = targets
                .iter()
                .map(|name| format!("'{}'", name.replace('\'', "''")))
                .collect::<Vec<_>>()
                .join(",");
            format!(
                "while (-not $p.HasExited) {{ Get-Process -Name {} -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 500 }}; $d=(Get-Date).AddSeconds(20); while ((Get-Date) -lt $d) {{ Get-Process -Name {} -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 250 }}",
                names_csv, names_csv
            )
        })
        .unwrap_or_else(|| "Wait-Process -Id $p.Id".to_string());

    let uninstall_command = format!(
        "$ErrorActionPreference = 'Stop'; {}; {}; exit $p.ExitCode",
        start_process_command, kill_loop
    );

    let mut uninstall_cmd = tokio::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-NoProfile",
            "-WindowStyle",
            "Hidden",
            "-Command",
            &uninstall_command,
        ])
        .spawn()
        .map_err(|e| format!("Kaldırma başlatılamadı: {}", e))?;

    let status = uninstall_cmd.wait().await.map_err(|e| {
        log::error!("Kaldırma process hatası ({}): {}", expanded_path, e);
        format!("Kaldırma process error: {}", e)
    })?;

    if status.success() {
        log::info!("Başarıyla kaldırıldı: {}", expanded_path);
        Ok("Uygulama başarıyla kaldırıldı.".to_string())
    } else {
        let code = status.code().unwrap_or(-1);
        log::error!(
            "Kaldırma başarısız ({}): Çıkış kodu {}",
            expanded_path,
            code
        );
        Err(format!("Kaldırma hatası: Çıkış kodu {}", code))
    }
}

#[tauri::command]
pub async fn uninstall_portable(
    url: String,
    app_name: String,
    uninstall_paths: Option<Vec<String>>,
) -> Result<String, String> {
    if let Some(paths) = uninstall_paths {
        log::info!(
            "Özel kaldırma yolları temizleniyor ({}): {:?}",
            app_name,
            paths
        );
        for path_str in paths {
            let expanded = expand_env_vars(&path_str);
            let path = std::path::Path::new(&expanded);
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

    let file_name = url.split('/').next_back().unwrap_or("app.exe");
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
pub async fn launch_portable(
    url: String,
    app_name: Option<String>,
    launch_file: Option<String>,
) -> Result<(), String> {
    let file_name = url.split('/').next_back().unwrap_or("app.exe");
    let base = std::path::PathBuf::from("C:\\StashZero");

    // 1. Precise launch_file check (highest priority)
    if let (Some(name), Some(l_file)) = (&app_name, &launch_file) {
        let full_l_path = base.join(name).join(l_file);
        if full_l_path.exists() {
            std::process::Command::new("powershell")
                .creation_flags(0x08000000)
                .args([
                    "-NoProfile",
                    "-Command",
                    &format!(
                        "Start-Process -FilePath '{}' -WorkingDirectory '{}'",
                        full_l_path.to_str().unwrap(),
                        base.join(name).to_str().unwrap()
                    ),
                ])
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
                let ps_cmd = format!("Get-ChildItem -Path '{}' -Filter *.exe -Recurse | Select-Object -First 1 -ExpandProperty FullName", folder.to_str().unwrap());
                let output = std::process::Command::new("powershell")
                    .creation_flags(0x08000000)
                    .args(["-NoProfile", "-Command", &ps_cmd])
                    .output()
                    .map_err(|e| format!("Arama hatası: {}", e))?;

                let found_exe = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !found_exe.is_empty() {
                    std::process::Command::new("powershell")
                        .creation_flags(0x08000000)
                        .args([
                            "-NoProfile",
                            "-Command",
                            &format!(
                                "Start-Process -FilePath '{}' -WorkingDirectory '{}'",
                                found_exe,
                                folder.to_str().unwrap()
                            ),
                        ])
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
            .args([
                "-NoProfile",
                "-Command",
                &format!("Start-Process -FilePath '{}'", path.to_str().unwrap()),
            ])
            .spawn()
            .map_err(|e| format!("Uygulama başlatılamadı: {}", e))?;
        Ok(())
    } else {
        Err("Uygulama bulunamadı.".to_string())
    }
}

#[tauri::command]
pub async fn delete_shortcuts(app_name: String) -> Result<(), String> {
    let safe_name = app_name.replace('\'', "''");
    let ps_cmd = format!(
        "$names = @(\"$HOME\\Desktop\\{}.lnk\", (Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs\\{}.lnk')); foreach ($n in $names) {{ if (Test-Path $n) {{ Remove-Item -LiteralPath $n -Force -ErrorAction SilentlyContinue }} }}",
        safe_name, safe_name
    );
    let _ = std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", &ps_cmd])
        .status();
    Ok(())
}

#[tauri::command]
pub async fn edit_text_file(path: String) -> Result<(), String> {
    let expanded = expand_env_vars(&path);
    if !std::path::Path::new(&expanded).exists() {
        return Err(format!("Dosya bulunamadı: {}", expanded));
    }
    std::process::Command::new("notepad.exe")
        .creation_flags(CREATE_NO_WINDOW)
        .arg(&expanded)
        .spawn()
        .map_err(|e| format!("Notepad açılamadı: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn launch_path(path: String) -> Result<(), String> {
    let expanded = expand_env_vars(&path);
    if !std::path::Path::new(&expanded).exists() {
        return Err(format!("Dosya bulunamadı: {}", expanded));
    }
    let working_dir = std::path::Path::new(&expanded)
        .parent()
        .and_then(|p| p.to_str())
        .unwrap_or("")
        .to_string();
    let escaped_path = expanded.replace('\'', "''");
    let escaped_wd = working_dir.replace('\'', "''");
    let ps_cmd = if escaped_wd.is_empty() {
        format!("Start-Process -FilePath '{}'", escaped_path)
    } else {
        format!(
            "Start-Process -FilePath '{}' -WorkingDirectory '{}'",
            escaped_path, escaped_wd
        )
    };
    std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", &ps_cmd])
        .spawn()
        .map_err(|e| format!("Başlatılamadı: {}", e))?;
    Ok(())
}

fn expand_env_vars(path: &str) -> String {
    let mut result = path.to_string();
    let env_vars = [
        ("$env:LocalAppData", "LOCALAPPDATA"),
        ("$env:AppData", "APPDATA"),
        ("$env:UserProfile", "USERPROFILE"),
        ("$env:ProgramFiles(x86)", "ProgramFiles(x86)"),
        ("$env:ProgramFiles", "ProgramFiles"),
        ("$env:ProgramData", "ProgramData"),
        ("$env:Public", "PUBLIC"),
        ("$env:WinDir", "WINDIR"),
        ("$env:SystemRoot", "SystemRoot"),
        ("$env:Temp", "TEMP"),
        ("$env:Tmp", "TMP"),
    ];
    for (placeholder, var) in env_vars.iter() {
        let lower_placeholder = placeholder.to_lowercase();
        loop {
            let lower_result = result.to_lowercase();
            match lower_result.find(&lower_placeholder) {
                Some(pos) => {
                    if let Ok(val) = std::env::var(var) {
                        let end = pos + placeholder.len();
                        result = format!("{}{}{}", &result[..pos], val, &result[end..]);
                    } else {
                        break;
                    }
                }
                None => break,
            }
        }
    }
    while let Some(start) = result.find('%') {
        if let Some(end_rel) = result[start + 1..].find('%') {
            let end = start + 1 + end_rel;
            let var_name = &result[start + 1..end];
            if let Ok(val) = std::env::var(var_name) {
                result = format!("{}{}{}", &result[..start], val, &result[end + 1..]);
            } else {
                break;
            }
        } else {
            break;
        }
    }
    result
}

async fn fetch_winget_list() -> Vec<(String, String)> {
    let ps_script = r#"
        $paths = @(
            "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
            "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
        )
        $installed = Get-ItemProperty $paths -ErrorAction SilentlyContinue | 
            Where-Object { 
                $_.DisplayName -ne $null -and $_.DisplayName -ne '' -and
                ($null -eq $_.InstallLocation -or $_.InstallLocation -eq '' -or (Test-Path $_.InstallLocation))
            } |
            Select-Object @{n='name';e={$_.DisplayName}}, @{n='version';e={$_.DisplayVersion}}
        
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

    let output = match tokio::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", ps_script])
        .output()
        .await
    {
        Ok(o) => o,
        Err(e) => {
            log::error!("Kayıt defteri okunamadı: {}", e);
            return Vec::new();
        }
    };

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
    final_list
}

#[tauri::command]
pub async fn get_installed_winget_ids() -> Result<Vec<(String, String)>, String> {
    Ok(fetch_winget_list().await)
}

#[tauri::command]
pub async fn get_all_installed_software() -> Result<Vec<serde_json::Value>, String> {
    let list = fetch_winget_list().await;
    let mut result = Vec::new();
    for (name, version) in list {
        result.push(serde_json::json!({
            "name": name,
            "version": version
        }));
    }
    Ok(result)
}

fn clean_version(raw: &str) -> String {
    let trimmed = raw.trim().trim_start_matches(['v', 'V']);
    let pre_cut: &str = trimmed.split(['-', '+']).next().unwrap_or(trimmed);
    // Handle "2, 19, 0, 0" comma-separated PE format → "2.19" (strip trailing .0)
    if pre_cut.contains(", ") {
        let joined: String = pre_cut
            .split(", ")
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>()
            .join(".");
        let mut s = joined.as_str();
        while s.ends_with(".0") && s.matches('.').count() > 1 {
            s = &s[..s.len() - 2];
        }
        return s.to_string();
    }
    pre_cut
        .split(' ')
        .next()
        .unwrap_or(pre_cut)
        .trim_end_matches(',')
        .to_string()
}

#[derive(serde::Deserialize)]
pub struct AppCheckInput {
    pub id: String,
    pub name: String,
    pub check_path: Option<String>,
}

#[derive(serde::Deserialize, Debug)]
pub struct DownloadFormPost {
    pub id_regex: String,
    pub server_regex: String,
}

async fn resolve_google_drive_url(url: &str, window: &TauriWindow) -> Option<String> {
    let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    let out = tokio::process::Command::new("curl.exe")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-sL", "-A", ua, url])
        .output()
        .await
        .ok()?;
    let html = String::from_utf8_lossy(&out.stdout);
    let trimmed = html.trim_start().to_lowercase();
    if !(trimmed.starts_with("<!doctype html")
        || trimmed.starts_with("<html")
        || trimmed.starts_with("<!doctype"))
    {
        // Already a binary response (no warning page) — leave URL untouched.
        return None;
    }
    let id_re = regex::Regex::new(r#"name="id"\s+value="([^"]+)""#).ok()?;
    let uuid_re = regex::Regex::new(r#"name="uuid"\s+value="([^"]+)""#).ok()?;
    let id = id_re.captures(&html)?.get(1)?.as_str().to_string();
    let uuid = uuid_re.captures(&html)?.get(1)?.as_str().to_string();
    let resolved = format!(
        "https://drive.usercontent.google.com/download?id={}&export=download&confirm=t&uuid={}",
        id, uuid
    );
    let _ = window.emit(
        "backend-log",
        serde_json::json!({
            "msg": "Google Drive virüs uyarısı atlatıldı (UUID alındı).",
            "log_type": "info"
        }),
    );
    Some(resolved)
}

async fn resolve_form_post_url(
    base_url: &str,
    form_post: &DownloadFormPost,
    package_id: &str,
    app_name: &str,
    window: &TauriWindow,
) -> Result<String, String> {
    let _ = window.emit(
        "backend-log",
        serde_json::json!({
            "msg": format!("{} indirme adresi çözülüyor (form akışı)...", app_name),
            "log_type": "info"
        }),
    );

    let jar_path = std::env::temp_dir().join(format!("stashzero_jar_{}.txt", package_id));
    let jar_str = jar_path
        .to_str()
        .ok_or_else(|| "Cookie jar yolu UTF-8 değil".to_string())?;
    let _ = std::fs::remove_file(&jar_path);

    let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    let page_out = tokio::process::Command::new("curl.exe")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-s", "-c", jar_str, "-b", jar_str, "-A", ua, base_url])
        .output()
        .await
        .map_err(|e| format!("Form sayfası alınamadı: {}", e))?;
    if !page_out.status.success() {
        let _ = std::fs::remove_file(&jar_path);
        return Err(format!(
            "Form sayfası alınamadı (curl exit {})",
            page_out.status.code().unwrap_or(-1)
        ));
    }
    let page_html = String::from_utf8_lossy(&page_out.stdout);

    let id_re =
        regex::Regex::new(&form_post.id_regex).map_err(|e| format!("id_regex geçersiz: {}", e))?;
    let id_val = id_re
        .captures(&page_html)
        .and_then(|c| c.get(1))
        .ok_or_else(|| "Form id eşleşmedi".to_string())?
        .as_str()
        .to_string();

    let body1 = format!("id={}", id_val);
    let mirror_out = tokio::process::Command::new("curl.exe")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-s", "-c", jar_str, "-b", jar_str, "-A", ua, "-X", "POST", "-d", &body1, base_url,
        ])
        .output()
        .await
        .map_err(|e| format!("Mirror sayfası alınamadı: {}", e))?;
    if !mirror_out.status.success() {
        let _ = std::fs::remove_file(&jar_path);
        return Err(format!(
            "Mirror sayfası alınamadı (curl exit {})",
            mirror_out.status.code().unwrap_or(-1)
        ));
    }
    let mirror_html = String::from_utf8_lossy(&mirror_out.stdout);

    let server_re = regex::Regex::new(&form_post.server_regex)
        .map_err(|e| format!("server_regex geçersiz: {}", e))?;
    let server_val = server_re
        .captures(&mirror_html)
        .and_then(|c| c.get(1))
        .ok_or_else(|| "Server id eşleşmedi".to_string())?
        .as_str()
        .to_string();

    let body2 = format!("id={}&server_id={}", id_val, server_val);
    let resp_out = tokio::process::Command::new("curl.exe")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-s", "-c", jar_str, "-b", jar_str, "-A", ua, "-i", "-X", "POST", "-d", &body2,
            base_url,
        ])
        .output()
        .await
        .map_err(|e| format!("Yönlendirme alınamadı: {}", e))?;
    let _ = std::fs::remove_file(&jar_path);
    if !resp_out.status.success() {
        return Err(format!(
            "Yönlendirme alınamadı (curl exit {})",
            resp_out.status.code().unwrap_or(-1)
        ));
    }
    let resp_text = String::from_utf8_lossy(&resp_out.stdout);
    let loc_re = regex::Regex::new(r"(?im)^location:\s*(\S+)").unwrap();
    let location = loc_re
        .captures(&resp_text)
        .and_then(|c| c.get(1))
        .ok_or_else(|| "Location header bulunamadı".to_string())?
        .as_str()
        .trim()
        .to_string();

    Ok(location)
}

async fn batch_get_versions(
    items: &[(String, String)],
) -> std::collections::HashMap<String, String> {
    use std::collections::HashMap;
    let mut versions: HashMap<String, String> = HashMap::new();
    if items.is_empty() {
        return versions;
    }

    let mut script = String::from("$ErrorActionPreference='SilentlyContinue';");
    for (id, path) in items {
        let esc_path = path.replace('\'', "''");
        let esc_id = id.replace('\'', "''");
        // Prefer ProductVersion, fall back to FileVersion (some tools — e.g. DNS
        // Jumper — leave ProductVersion blank). Empty result yields "Kurulu" downstream.
        script.push_str(&format!(
            "try {{ $vi=(Get-Item -LiteralPath '{}' -ErrorAction Stop).VersionInfo; $v=$vi.ProductVersion; if ([string]::IsNullOrWhiteSpace($v)) {{ $v=$vi.FileVersion }}; Write-Output ('{}|' + $v) }} catch {{ Write-Output '{}|' }};",
            esc_path, esc_id, esc_id
        ));
    }

    let output = match tokio::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", &script])
        .output()
        .await
    {
        Ok(o) => o,
        Err(e) => {
            log::error!("Toplu sürüm sorgusu başarısız: {}", e);
            return versions;
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let trimmed = line.trim();
        if let Some(idx) = trimmed.find('|') {
            let id = trimmed[..idx].trim().to_string();
            let v = trimmed[idx + 1..].trim().to_string();
            if !id.is_empty() {
                versions.insert(id, v);
            }
        }
    }
    versions
}

#[tauri::command]
pub async fn batch_check_installations(
    apps: Vec<AppCheckInput>,
) -> Result<std::collections::HashMap<String, String>, String> {
    use std::collections::HashMap;

    let winget_handle = tokio::spawn(fetch_winget_list());

    let mut existing_paths: Vec<(String, String)> = Vec::new();
    for app in &apps {
        if let Some(p) = &app.check_path {
            let expanded = expand_env_vars(p);
            if std::path::Path::new(&expanded).exists() {
                existing_paths.push((app.id.clone(), expanded));
            }
        }
    }

    let versions = batch_get_versions(&existing_paths).await;
    let winget = winget_handle.await.unwrap_or_default();

    let mut installed: HashMap<String, String> = HashMap::new();
    for (id, _path) in &existing_paths {
        let v = versions.get(id).cloned().unwrap_or_default();
        let display = if v.is_empty() {
            "Kurulu".to_string()
        } else {
            clean_version(&v)
        };
        installed.insert(id.clone(), display);
    }

    for app in &apps {
        if installed.contains_key(&app.id) {
            continue;
        }
        let lower_name = app.name.to_lowercase();
        let lower_id = app.id.to_lowercase();
        for (name, version) in &winget {
            let lower_n = name.to_lowercase();
            if lower_n == lower_name || lower_n == lower_id || lower_n.contains(&lower_name) {
                let display = if version.is_empty() {
                    "Kurulu".to_string()
                } else {
                    clean_version(version)
                };
                installed.insert(app.id.clone(), display);
                break;
            }
        }
    }

    Ok(installed)
}

#[tauri::command]
pub fn check_path_exists(path: String) -> bool {
    if path.contains('$') {
        let output = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", &format!("Test-Path \"{}\"", path)])
            .output();

        if let Ok(out) = output {
            return String::from_utf8_lossy(&out.stdout).trim().to_lowercase() == "true";
        }
    }
    std::path::Path::new(&path).exists()
}

#[tauri::command]
pub async fn get_file_version(path: String) -> Result<String, String> {
    if !check_path_exists(path.clone()) {
        return Err("Dosya bulunamadı".to_string());
    }

    let ps_script = format!("(Get-Item -Path \"{}\").VersionInfo.ProductVersion", path);

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
#[allow(clippy::too_many_arguments)]
pub async fn install_exe_from_url(
    window: TauriWindow,
    url: String,
    package_id: String,
    app_name: String,
    is_portable: bool,
    install_args: Option<String>,
    shortcut_path: Option<String>,
    post_install_cmd: Option<String>,
    pre_install_cmd: Option<String>,
    install_kill_targets: Option<Vec<String>>,
    download_form_post: Option<DownloadFormPost>,
    install_path: Option<String>,
    create_desktop_shortcut: Option<bool>,
    launch_file: Option<String>,
    launch_path: Option<String>,
    create_start_menu_shortcut: Option<bool>,
    archive_password: Option<String>,
    check_path: Option<String>,
    install_as_admin: Option<bool>,
) -> Result<String, String> {
    log::info!("Kurulum başlatılıyor: {} ({})", app_name, package_id);
    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("Kurulum başlatılıyor: {} ({})", app_name, package_id), "log_type": "info" }));

    // GitHub 'latest' link resolution
    let mut final_url = url.clone();
    let is_github_latest = url.contains("github.com") && url.contains("releases/latest");

    if is_github_latest {
        let _ = window.emit("backend-log", serde_json::json!({ "msg": "GitHub üzerinden en güncel sürüm çözümleniyor...", "log_type": "info" }));

        let api_url = match url.find("/releases/latest") {
            Some(pos) => {
                let prefix = &url[..pos + "/releases/latest".len()];
                prefix.replace("github.com/", "api.github.com/repos/")
            }
            None => url.replace("github.com/", "api.github.com/repos/"),
        };
        let output = tokio::process::Command::new("curl")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-s", "-L", "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", &api_url])
            .output().await.map_err(|e| format!("GitHub API hatası: {}", e))?;

        let json: serde_json::Value = serde_json::from_slice(&output.stdout)
            .map_err(|e| format!("JSON ayrıştırma hatası: {}", e))?;
        let mut found_asset = false;
        let requested_asset = url
            .split("/download/")
            .nth(1)
            .and_then(|name| name.split('?').next())
            .map(|name| name.to_lowercase());

        if let Some(assets) = json.get("assets").and_then(|a| a.as_array()) {
            let asset = requested_asset
                .as_deref()
                .and_then(|requested| {
                    assets.iter().find(|a| {
                        a.get("name")
                            .and_then(|n| n.as_str())
                            .map(|name| name.eq_ignore_ascii_case(requested))
                            .unwrap_or(false)
                    })
                })
                .or_else(|| {
                    assets.iter().find(|a| {
                        let name = a
                            .get("name")
                            .and_then(|n| n.as_str())
                            .unwrap_or("")
                            .to_lowercase();
                        name.ends_with(".exe")
                            && name.contains("lt20")
                            && !name.contains("portable")
                            && !name.contains("arm")
                    })
                })
                .or_else(|| {
                    assets.iter().find(|a| {
                        let name = a
                            .get("name")
                            .and_then(|n| n.as_str())
                            .unwrap_or("")
                            .to_lowercase();
                        name.ends_with(".exe")
                            && (name.contains("windows-x64")
                                || name.contains("win-x64")
                                || name.contains("win64")
                                || name.contains("x64-setup"))
                            && !name.contains("portable")
                            && !name.contains("ia32")
                            && !name.contains("arm")
                    })
                })
                .or_else(|| {
                    assets.iter().find(|a| {
                        let name = a
                            .get("name")
                            .and_then(|n| n.as_str())
                            .unwrap_or("")
                            .to_lowercase();
                        name.ends_with(".exe")
                            && !name.contains("portable")
                            && !name.contains("ia32")
                            && !name.contains("arm")
                    })
                })
                .or_else(|| {
                    assets.iter().find(|a| {
                        let name = a
                            .get("name")
                            .and_then(|n| n.as_str())
                            .unwrap_or("")
                            .to_lowercase();
                        name.ends_with(".msi")
                            && (name.contains("x64") || name.contains("win-x64"))
                            && !name.contains("arm")
                    })
                })
                .or_else(|| {
                    assets.iter().find(|a| {
                        let name = a
                            .get("name")
                            .and_then(|n| n.as_str())
                            .unwrap_or("")
                            .to_lowercase();
                        name.ends_with(".msi") && !name.contains("arm")
                    })
                })
                .or_else(|| {
                    assets.iter().find(|a| {
                        let name = a
                            .get("name")
                            .and_then(|n| n.as_str())
                            .unwrap_or("")
                            .to_lowercase();
                        name.ends_with(".zip")
                            && (name.contains("windows")
                                || name.contains("win64")
                                || name.contains("-win"))
                    })
                })
                .or_else(|| {
                    assets.iter().find(|a| {
                        let name = a
                            .get("name")
                            .and_then(|n| n.as_str())
                            .unwrap_or("")
                            .to_lowercase();
                        name.ends_with(".zip")
                            && !name.contains("linux")
                            && !name.contains("macos")
                            && !name.contains("darwin")
                            && !name.contains("arm")
                            && !name.contains("source")
                            && !name.contains("symbols")
                    })
                });

            if let Some(a) = asset {
                if let Some(download_url) = a.get("browser_download_url").and_then(|u| u.as_str()) {
                    final_url = download_url.to_string();
                    found_asset = true;
                    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("En güncel sürüm bulundu: {}", final_url.split('/').next_back().unwrap_or("setup.exe")), "log_type": "success" }));
                }
            }
        }

        if !found_asset {
            return Err(
                "GitHub üzerinden kurulum dosyası bulunamadı. Lütfen daha sonra tekrar deneyin."
                    .to_string(),
            );
        }
    }

    if let Some(form_post) = &download_form_post {
        final_url =
            resolve_form_post_url(&final_url, form_post, &package_id, &app_name, &window).await?;
    }

    // Google Drive virus-warning bypass: when the URL points at drive.google.com /
    // drive.usercontent.google.com, the server returns an HTML "can't scan for
    // viruses" page with a form whose `uuid` token is required to actually fetch the
    // file. Resolve it transparently here so library entries can keep using plain
    // Drive URLs (e.g. Sordum tools that redirect through Drive).
    if final_url.contains("drive.google.com") || final_url.contains("drive.usercontent.google.com")
    {
        if let Some(resolved) = resolve_google_drive_url(&final_url, &window).await {
            final_url = resolved;
        }
    }

    log::debug!(
        "URL: {}, Portable: {}, Args: {:?}",
        final_url,
        is_portable,
        install_args
    );
    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("İndirme başlatılıyor: {}", final_url), "log_type": "info" }));

    let _ = window.emit(
        "install-progress",
        serde_json::json!({
            "package_id": package_id,
            "percentage": 10,
            "message": format!("{} indiriliyor...", app_name)
        }),
    );

    // Preserve known extensions (.exe/.zip/.msi/.7z) from the resolved URL, otherwise fall back to <id>.exe
    let url_filename = final_url
        .split('?')
        .next()
        .unwrap_or(&final_url)
        .split('/')
        .next_back()
        .unwrap_or("");
    let known_exts = [".exe", ".zip", ".msi", ".7z"];
    let file_name = if package_id.eq_ignore_ascii_case("firefox") {
        "FirefoxSetup.exe".to_string()
    } else if package_id.eq_ignore_ascii_case("dropbox") {
        "dropboxinstall.exe".to_string()
    } else if known_exts
        .iter()
        .any(|ext| url_filename.to_lowercase().ends_with(ext))
    {
        url_filename.to_string()
    } else {
        format!("{}.exe", package_id)
    };
    let stash_base = std::path::PathBuf::from("C:\\StashZero");
    if !stash_base.exists() {
        std::fs::create_dir_all(&stash_base)
            .map_err(|e| format!("StashZero klasörü oluşturulamadı: {}", e))?;
    }

    let target_path = if let Some(custom_dir) = &install_path {
        let dir = std::path::PathBuf::from(custom_dir);
        if !dir.exists() {
            std::fs::create_dir_all(&dir)
                .map_err(|e| format!("Hedef klasör oluşturulamadı: {}", e))?;
        }
        if file_name.to_lowercase().ends_with(".exe") {
            dir.join(format!("{}.exe", package_id))
        } else {
            dir.join(&file_name)
        }
    } else if is_portable {
        let app_dir = stash_base.join(&app_name);
        if !app_dir.exists() {
            std::fs::create_dir_all(&app_dir)
                .map_err(|e| format!("Uygulama klasörü oluşturulamadı: {}", e))?;
        }
        // For direct EXE downloads, normalize to <id>.exe; for archives, keep the original filename so extension survives.
        if file_name.to_lowercase().ends_with(".exe") {
            app_dir.join(format!("{}.exe", package_id))
        } else {
            app_dir.join(&file_name)
        }
    } else {
        std::env::temp_dir().join(&file_name)
    };

    log::debug!(
        "Dosya indiriliyor: {} -> {}",
        final_url,
        target_path.display()
    );
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
                if n == 0 {
                    break;
                }
                let line = String::from_utf8_lossy(&buffer).to_string();
                buffer.clear();

                let clean_line = line.replace(['\r', '\n'], "");
                let parts: Vec<&str> = clean_line.split_whitespace().collect();

                if parts.len() >= 7 {
                    if let Ok(pct) = parts[0].parse::<u32>() {
                        let total_size = parts.get(1).unwrap_or(&"");
                        let received = parts.get(3).unwrap_or(&"");
                        let speed = parts.get(6).unwrap_or(&"");

                        if total_size == &"0" && received == &"0" {
                            continue;
                        }

                        let current_message = format!(
                            "{} indiriliyor... %{} | Boyut: {} | Alınan: {} | Hız: {}",
                            app_name_clone, pct, total_size, received, speed
                        );

                        if current_message != last_message {
                            let _ = window_clone.emit(
                                "install-progress",
                                serde_json::json!({
                                    "package_id": package_id_clone,
                                    "percentage": pct,
                                    "message": current_message.clone()
                                }),
                            );
                            last_message = current_message;
                        }
                    }
                }
            }
        });
    }

    let status = curl_cmd.wait().await.map_err(|e| {
        log::error!("curl.exe hatası: {}", e);
        format!("curl.exe süreç hatası: {}", e)
    })?;

    if !status.success() {
        log::error!(
            "İndirme başarısız ({}): Çıkış kodu {}",
            app_name,
            status.code().unwrap_or(-1)
        );
        return Err(format!(
            "İndirme başarısız (HTTP hatası veya bağlantı kesildi): Çıkış kodu {}",
            status.code().unwrap_or(-1)
        ));
    }

    // Check file size and existence
    let metadata = std::fs::metadata(&target_path).map_err(|e| {
        log::error!(
            "İndirilen dosya bulunamadı: {} - {}",
            target_path.display(),
            e
        );
        format!("İndirilen dosya bulunamadı: {}", e)
    })?;

    let size_mb = metadata.len() as f64 / (1024.0 * 1024.0);
    log::info!(
        "İndirme tamamlandı: {} (Boyut: {:.1} MB)",
        app_name,
        size_mb
    );
    let _ = window.emit(
        "backend-log",
        serde_json::json!({
            "msg": format!("İndirme bitti, dosya boyutu: {:.1} MB", size_mb),
            "log_type": "info"
        }),
    );

    if metadata.len() < 1024 {
        let _ = std::fs::remove_file(&target_path); // Clean up bad file
        return Err(
            "İndirilen dosya çok küçük (1KB altı), muhtemelen hatalı veya sunucu hatası oluştu."
                .to_string(),
        );
    }

    // HTML detection: when a CDN (Google Drive virus warning, login redirect, captcha)
    // returns an HTML page instead of the binary, curl saves it with the .exe name and
    // we'd silently treat it as a successful install. Sniff the first bytes for HTML.
    if let Ok(mut f) = std::fs::File::open(&target_path) {
        use std::io::Read;
        let mut head = [0u8; 256];
        let n = f.read(&mut head).unwrap_or(0);
        let head_str = String::from_utf8_lossy(&head[..n]).to_lowercase();
        let head_trim = head_str.trim_start();
        let looks_html = head_trim.starts_with("<!doctype html")
            || head_trim.starts_with("<html")
            || head_trim.starts_with("<!doctype")
            || head_trim.starts_with("<head");
        if looks_html {
            let _ = std::fs::remove_file(&target_path);
            return Err(
                "İndirilen dosya HTML içeriği (büyük olasılıkla virüs uyarısı veya yönlendirme sayfası). Lütfen alternatif bir indirme bağlantısı kullanın.".to_string()
            );
        }
        // ZIP archive detection: some Sordum tools (e.g. Windows Update Blocker)
        // arrive as a plain ZIP via Drive even though the saved filename is .exe.
        // Extract with PowerShell's Expand-Archive (no password needed).
        // Skip when the URL/filename already advertises .zip — the explicit is_zip
        // path further below handles those (with launch_file resolution etc.).
        let already_zip_by_name = final_url.to_lowercase().ends_with(".zip")
            || file_name.to_lowercase().ends_with(".zip");
        if n >= 4
            && &head[..4] == b"PK\x03\x04"
            && archive_password.is_none()
            && !already_zip_by_name
        {
            let extract_dir = target_path
                .parent()
                .ok_or_else(|| "Çıkarma için hedef klasör bulunamadı.".to_string())?;
            let zip_path = target_path.with_extension("zip");
            std::fs::rename(&target_path, &zip_path)
                .map_err(|e| format!("ZIP yeniden adlandırılamadı: {}", e))?;
            let _ = window.emit(
                "backend-log",
                serde_json::json!({
                    "msg": format!("ZIP arşivi tespit edildi, çıkarılıyor: {}", zip_path.display()),
                    "log_type": "info"
                }),
            );
            // Smart flatten: extract to a temp dir; if the archive has exactly one
            // top-level wrapper folder (typical), promote its CONTENTS (preserving
            // nested subdirs like x86/x86_64) into the install dir. Otherwise move
            // everything as-is. Keeps legitimate subfolders intact.
            let ps_cmd = format!(
                "$dest = '{}'; $zip = '{}'; $tmp = Join-Path $dest '__sz_unzip'; if (Test-Path $tmp) {{ Remove-Item -LiteralPath $tmp -Recurse -Force }}; New-Item -ItemType Directory -Path $tmp -Force | Out-Null; Expand-Archive -Path $zip -DestinationPath $tmp -Force; $entries = @(Get-ChildItem -LiteralPath $tmp -Force); if ($entries.Count -eq 1 -and $entries[0].PSIsContainer) {{ Get-ChildItem -LiteralPath $entries[0].FullName -Force | ForEach-Object {{ Move-Item -LiteralPath $_.FullName -Destination $dest -Force }} }} else {{ $entries | ForEach-Object {{ Move-Item -LiteralPath $_.FullName -Destination $dest -Force }} }}; Remove-Item -LiteralPath $tmp -Recurse -Force",
                extract_dir.to_str().unwrap().replace('\'', "''"),
                zip_path.to_str().unwrap().replace('\'', "''")
            );
            let output = tokio::process::Command::new("powershell")
                .creation_flags(CREATE_NO_WINDOW)
                .args(["-NoProfile", "-Command", &ps_cmd])
                .output()
                .await
                .map_err(|e| {
                    let _ = std::fs::remove_file(&zip_path);
                    format!("ZIP çıkarıcı çalıştırılamadı: {}", e)
                })?;
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                let _ = std::fs::remove_file(&zip_path);
                return Err(format!("ZIP çıkarma başarısız: {}", stderr));
            }
            let _ = std::fs::remove_file(&zip_path);
            let _ = window.emit(
                "backend-log",
                serde_json::json!({
                    "msg": format!("ZIP çıkarma tamamlandı: {}", extract_dir.display()),
                    "log_type": "success"
                }),
            );
        }

        // Encrypted archive detection: Sordum tools (Defender Control etc.) ship as
        // password-protected RAR via Google Drive to avoid AV false-positives. Auto-
        // extract when the library entry provides `archive_password`; otherwise fail
        // loudly so we never store a "corrupt .exe".
        if n >= 4 && &head[..4] == b"Rar!" {
            let password = archive_password.as_deref().ok_or_else(||
                "İndirilen dosya parola korumalı bir RAR arşivi. Otomatik kurulum yapılamaz — lütfen sağlayıcının resmi sayfasından manuel indirin (Sordum araçlarında parola: sordum).".to_string()
            )?;
            let unrar_paths = [
                "C:\\Program Files\\WinRAR\\unrar.exe",
                "C:\\Program Files (x86)\\WinRAR\\unrar.exe",
            ];
            let sevenz_paths = [
                "C:\\Program Files\\7-Zip\\7z.exe",
                "C:\\Program Files (x86)\\7-Zip\\7z.exe",
            ];
            let unrar_found = unrar_paths
                .iter()
                .find(|p| std::path::Path::new(p).exists());
            let sevenz_found = sevenz_paths
                .iter()
                .find(|p| std::path::Path::new(p).exists());
            let extract_dir = target_path
                .parent()
                .ok_or_else(|| "Çıkarma için hedef klasör bulunamadı.".to_string())?;
            let rar_path = target_path.with_extension("rar");
            std::fs::rename(&target_path, &rar_path)
                .map_err(|e| format!("RAR yeniden adlandırılamadı: {}", e))?;
            let _ = window.emit("backend-log", serde_json::json!({
                "msg": format!("Şifreli RAR tespit edildi, çıkarılıyor: {}", rar_path.display()),
                "log_type": "info"
            }));
            let extract_status = if let Some(unrar) = unrar_found {
                tokio::process::Command::new(unrar)
                    .creation_flags(CREATE_NO_WINDOW)
                    .args([
                        "e",
                        &format!("-p{}", password),
                        "-y",
                        "-o+",
                        rar_path.to_str().unwrap(),
                        &format!("{}\\", extract_dir.to_str().unwrap()),
                    ])
                    .output()
                    .await
            } else if let Some(sevenz) = sevenz_found {
                tokio::process::Command::new(sevenz)
                    .creation_flags(CREATE_NO_WINDOW)
                    .args([
                        "e",
                        rar_path.to_str().unwrap(),
                        &format!("-o{}", extract_dir.to_str().unwrap()),
                        &format!("-p{}", password),
                        "-y",
                    ])
                    .output()
                    .await
            } else {
                let _ = std::fs::remove_file(&rar_path);
                return Err(
                    "RAR çıkarmak için 7-Zip veya WinRAR gerekli. Lütfen birini yükleyin."
                        .to_string(),
                );
            };
            let output = extract_status.map_err(|e| {
                let _ = std::fs::remove_file(&rar_path);
                format!("Çıkarıcı çalıştırılamadı: {}", e)
            })?;
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                let _ = std::fs::remove_file(&rar_path);
                return Err(format!(
                    "RAR çıkarma başarısız (parola hatalı olabilir): {}",
                    if stderr.is_empty() {
                        format!("exit {}", output.status.code().unwrap_or(-1))
                    } else {
                        stderr
                    }
                ));
            }
            let _ = std::fs::remove_file(&rar_path);
            log::info!(
                "RAR çıkarıldı: {} -> {}",
                rar_path.display(),
                extract_dir.display()
            );
            let _ = window.emit(
                "backend-log",
                serde_json::json!({
                    "msg": format!("RAR çıkarma tamamlandı: {}", extract_dir.display()),
                    "log_type": "success"
                }),
            );
        }
    }

    log::info!("İndirme tamamlandı: {}", app_name);

    let is_zip =
        final_url.to_lowercase().ends_with(".zip") || file_name.to_lowercase().ends_with(".zip");

    if is_zip {
        let _ = window.emit(
            "install-progress",
            serde_json::json!({
                "package_id": package_id,
                "percentage": null,
                "message": format!("{} ayıklanıyor...", app_name)
            }),
        );

        let extract_path = if is_portable {
            stash_base.join(&app_name)
        } else {
            // Non-portable zips like SDI also go to C:\StashZero per user request
            // to keep the system root clean but consolidated.
            stash_base.join(&app_name)
        };

        if !extract_path.exists() {
            std::fs::create_dir_all(&extract_path)
                .map_err(|e| format!("Klasör oluşturulamadı: {}", e))?;
        }

        log::info!("Ayıklama başlatılıyor: {}", target_path.display());
        // Smart flatten + cleanup: extract to a temp dir; if the archive has a
        // single top-level wrapper folder, promote its contents (preserving any
        // nested subdirs) into the install dir. Otherwise move all top-level
        // entries as-is. Then remove the temp dir and original .zip.
        let unzip_ps = format!(
            "$dest = '{}'; $zip = '{}'; $tmp = Join-Path $dest '__sz_unzip'; if (Test-Path $tmp) {{ Remove-Item -LiteralPath $tmp -Recurse -Force }}; New-Item -ItemType Directory -Path $tmp -Force | Out-Null; Expand-Archive -Path $zip -DestinationPath $tmp -Force; $entries = @(Get-ChildItem -LiteralPath $tmp -Force); if ($entries.Count -eq 1 -and $entries[0].PSIsContainer) {{ Get-ChildItem -LiteralPath $entries[0].FullName -Force | ForEach-Object {{ Move-Item -LiteralPath $_.FullName -Destination $dest -Force }} }} else {{ $entries | ForEach-Object {{ Move-Item -LiteralPath $_.FullName -Destination $dest -Force }} }}; Remove-Item -LiteralPath $tmp -Recurse -Force; if (Test-Path $zip) {{ Remove-Item -LiteralPath $zip -Force }}",
            extract_path.to_str().unwrap().replace('\'', "''"),
            target_path.to_str().unwrap().replace('\'', "''")
        );
        let unzip_cmd = tokio::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", &unzip_ps])
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| {
                log::error!("Ayıklama başlatılamadı: {}", e);
                format!("Ayıklama başlatılamadı: {}", e)
            })?;

        let output = unzip_cmd
            .wait_with_output()
            .await
            .map_err(|e| format!("Ayıklama hatası: {}", e))?;
        if output.status.success() {
            let msg = format!("{} başarıyla C:\\StashZero klasörüne ayıklandı.", app_name);
            if let Some(path) = shortcut_path {
                let _ = copy_shortcut_to_desktop(&path);
            }
            let need_desktop = create_desktop_shortcut.unwrap_or(false);
            let need_start_menu = create_start_menu_shortcut.unwrap_or(false);
            if need_desktop || need_start_menu {
                let lf = launch_file.as_deref();
                let exe_in_extract: Option<std::path::PathBuf> = if let Some(name) = lf {
                    let candidate = extract_path.join(name);
                    if candidate.exists() {
                        Some(candidate)
                    } else {
                        None
                    }
                } else {
                    std::fs::read_dir(&extract_path).ok().and_then(|mut rd| {
                        rd.find_map(|e| {
                            let entry = e.ok()?;
                            let p = entry.path();
                            if p.extension()
                                .and_then(|s| s.to_str())
                                .map(|s| s.eq_ignore_ascii_case("exe"))
                                .unwrap_or(false)
                            {
                                Some(p)
                            } else {
                                None
                            }
                        })
                    })
                };
                if let Some(exe_path) = exe_in_extract {
                    if let Some(target_str) = exe_path.to_str() {
                        if need_desktop {
                            let _ = create_desktop_shortcut_fn(target_str, &app_name);
                        }
                        if need_start_menu {
                            let _ = create_start_menu_shortcut_fn(target_str, &app_name);
                        }
                    }
                }
            }
            let _ = window.emit(
                "install-progress",
                serde_json::json!({
                    "package_id": package_id,
                    "percentage": 100,
                    "message": msg.clone()
                }),
            );
            if let Some(cmd) = post_install_cmd {
                log::info!("Kurulum sonrası komut çalıştırılıyor: {}", cmd);
                let _ = window.emit(
                    "backend-log",
                    serde_json::json!({
                        "msg": format!("{}: ek paketler hazırlanıyor...", app_name),
                        "log_type": "process"
                    }),
                );
                let spawn_result = tokio::process::Command::new("powershell")
                    .creation_flags(CREATE_NO_WINDOW)
                    .args(powershell_encoded_command_args(&cmd))
                    .stdout(std::process::Stdio::piped())
                    .stderr(std::process::Stdio::piped())
                    .spawn();
                if let Ok(mut child) = spawn_result {
                    if let Some(stdout) = child.stdout.take() {
                        let window_clone = window.clone();
                        tokio::spawn(async move {
                            use tokio::io::AsyncBufReadExt;
                            let mut lines = tokio::io::BufReader::new(stdout).lines();
                            while let Ok(Some(line)) = lines.next_line().await {
                                let trimmed = line.trim().to_string();
                                if !trimmed.is_empty() {
                                    log::info!("[post_install] {}", trimmed);
                                    let _ = window_clone.emit(
                                        "backend-log",
                                        serde_json::json!({
                                            "msg": trimmed,
                                            "log_type": "process"
                                        }),
                                    );
                                }
                            }
                        });
                    }
                    let _ = child.wait().await;
                }
            }
            return Ok(msg);
        } else {
            let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!(
                "Ayıklama başarısız: {}",
                if err_msg.is_empty() {
                    "Bilinmeyen PowerShell hatası".to_string()
                } else {
                    err_msg
                }
            ));
        }
    }

    if is_portable || install_path.is_some() {
        let dest_dir = install_path
            .as_deref()
            .map(|p| p.to_string())
            .unwrap_or_else(|| format!("C:\\StashZero\\{}", app_name));
        let msg = format!("{} başarıyla {} konumuna kuruldu.", app_name, dest_dir);
        if let Some(path) = shortcut_path {
            let _ = copy_shortcut_to_desktop(&path);
        }
        // Prefer launch_path when set (it survives archive extraction; target_path
        // may be gone after a RAR extract). Fall back to target_path otherwise.
        let shortcut_target = launch_path
            .as_deref()
            .map(expand_env_vars)
            .filter(|p| std::path::Path::new(p).exists())
            .or_else(|| target_path.to_str().map(|s| s.to_string()));
        if let Some(target_str) = shortcut_target {
            if create_desktop_shortcut.unwrap_or(false) {
                let _ = create_desktop_shortcut_fn(&target_str, &app_name);
            }
            if create_start_menu_shortcut.unwrap_or(false) {
                let _ = create_start_menu_shortcut_fn(&target_str, &app_name);
            }
        }
        let _ = window.emit(
            "install-progress",
            serde_json::json!({
                "package_id": package_id,
                "percentage": 100,
                "message": msg.clone()
            }),
        );
        return Ok(msg);
    }

    let _ = window.emit(
        "install-progress",
        serde_json::json!({
            "package_id": package_id,
            "percentage": null,
            "message": format!("{} kuruluyor...", app_name)
        }),
    );

    if let Some(cmd) = pre_install_cmd.as_deref().filter(|cmd| !cmd.trim().is_empty()) {
        log::info!("Kurulum oncesi komut calistiriliyor: {}", cmd);
        let _ = window.emit(
            "backend-log",
            serde_json::json!({
                "msg": format!("Kurulum oncesi hazirlik: {}", app_name),
                "log_type": "process"
            }),
        );
        let status = tokio::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(powershell_encoded_command_args(cmd))
            .status()
            .await;
        if let Err(e) = status {
            log::warn!("pre_install_cmd baslatilamadi: {}", e);
        }
    }

    let target_str = target_path.to_str().unwrap();
    // Default silent flag depends on installer type: MSI uses /qn /norestart,
    // NSIS-style EXE uses /S. Library entries can override via install_args.
    let final_args = if package_id.eq_ignore_ascii_case("dropbox") {
        String::new()
    } else {
        install_args.unwrap_or_else(|| {
            if target_str.to_lowercase().ends_with(".msi") {
                "/qn /norestart".to_string()
            } else {
                "/S".to_string()
            }
        })
    };

    // Split arguments by space and wrap each in single quotes for PowerShell array
    let parsed_args = split_windows_args(&final_args);

    let args_part = if final_args.trim().is_empty() {
        "".to_string()
    } else {
        format!("-ArgumentList '{}'", final_args.replace('\'', "''"))
    };

    log::info!(
        "Kurulum başlatılıyor: {} -> Args: {}",
        target_str,
        final_args
    );
    let _ = window.emit("backend-log", serde_json::json!({ "msg": format!("Yükleyici çalıştırılıyor: {} {}", target_str, final_args), "log_type": "process" }));

    let is_msi = target_str.to_lowercase().ends_with(".msi");
    let run_as_admin = install_as_admin.unwrap_or(true);
    let verb_part = if run_as_admin { " -Verb RunAs" } else { "" };
    // For MSI files, Start-Process -FilePath foo.msi routes via shell association
    // and silently drops msiexec args (/qn, ALLUSERS=1 etc.). Invoke msiexec directly instead.
    let (filepath_for_start, args_part_for_start) = if is_msi {
        let mut msi_args = vec![
            "'/i'".to_string(),
            format!("'{}'", target_str.replace('\'', "''")),
        ];
        for tok in &parsed_args {
            msi_args.push(format!("'{}'", tok.replace('\'', "''")));
        }
        (
            "msiexec".to_string(),
            format!("-ArgumentList @({})", msi_args.join(", ")),
        )
    } else {
        (format!("'{}'", target_str), args_part.clone())
    };

    let install_command_str = match install_kill_targets.as_ref().filter(|v| !v.is_empty()) {
        Some(targets) => {
            let names_csv = targets
                .iter()
                .map(|n| format!("'{}'", n.replace('\'', "''")))
                .collect::<Vec<_>>()
                .join(",");
            // Detached post-install watcher — keeps killing the targets for 30s after
            // the installer exits, in the same elevated context (inherits admin from
            // the parent elevated PS, no extra UAC). Catches GUIs that launch right
            // as the extractor finishes (e.g. Emsisoft's first-run EULA).
            let watcher_cmd = format!(
                "$d=(Get-Date).AddSeconds(30); while ((Get-Date) -lt $d) {{ Get-Process -Name {} -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 250 }}",
                names_csv
            );
            use base64::{engine::general_purpose::STANDARD, Engine as _};
            let watcher_utf16: Vec<u8> = watcher_cmd
                .encode_utf16()
                .flat_map(|c| c.to_le_bytes())
                .collect();
            let watcher_b64 = STANDARD.encode(&watcher_utf16);
            let inner = format!(
                "$p = Start-Process -FilePath {} {} -PassThru; while (!$p.HasExited) {{ Get-Process -Name {} -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 500 }}; Start-Process powershell -WindowStyle Hidden -ArgumentList @('-NoProfile','-EncodedCommand','{}'); exit $p.ExitCode",
                filepath_for_start, args_part_for_start, names_csv, watcher_b64
            );
            let inner_escaped = inner.replace('\'', "''");
            if run_as_admin {
                format!(
                    "$ErrorActionPreference = 'Stop'; $cmd = '{}'; $b = [System.Text.Encoding]::Unicode.GetBytes($cmd); $e = [Convert]::ToBase64String($b); $pp = Start-Process powershell -Verb RunAs -WindowStyle Hidden -ArgumentList @('-NoProfile','-EncodedCommand',$e) -PassThru; $deadline = (Get-Date).AddMinutes(10); while (-not $pp.HasExited -and (Get-Date) -lt $deadline) {{ Start-Sleep -Milliseconds 500 }}; if (-not $pp.HasExited) {{ Stop-Process -Id $pp.Id -Force -ErrorAction SilentlyContinue }}; $code = if ($pp.HasExited) {{ $pp.ExitCode }} else {{ -1 }}; exit $code",
                    inner_escaped
                )
            } else {
                format!("$ErrorActionPreference = 'Stop'; {}", inner)
            }
        }
        None => format!(
            "$ErrorActionPreference = 'Stop'; $p = Start-Process -FilePath {} {}{} -PassThru; $deadline = (Get-Date).AddMinutes(15); while (-not $p.HasExited -and (Get-Date) -lt $deadline) {{ Start-Sleep -Milliseconds 500 }}; if (-not $p.HasExited) {{ Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }}; $code = if ($p.HasExited) {{ $p.ExitCode }} else {{ -1 }}; exit $code",
            filepath_for_start, args_part_for_start, verb_part
        ),
    };

    let mut install_cmd = tokio::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-NoProfile",
            "-WindowStyle",
            "Hidden",
            "-Command",
            &install_command_str,
        ])
        .spawn()
        .map_err(|e| {
            log::error!("Kurulum başlatılamadı: {}", e);
            format!("Kurulum başlatılamadı: {}", e)
        })?;

    let install_status = install_cmd.wait().await.map_err(|e| {
        log::error!("Kurulum süreci hatası ({}): {}", app_name, e);
        format!("Kurulum süreç hatası: {}", e)
    })?;

    // When install_kill_targets is active, the killed [Run] task can cause non-zero
    // exit codes (e.g. install4j returns 22) even though the install completed.
    // Treat any termination as success in that case — caller validates via check_path.
    let install_succeeded = install_status.success() || install_kill_targets.is_some();

    if install_succeeded {
        if !install_status.success() {
            let code = install_status.code().unwrap_or(-1);
            log::info!(
                "Kurulum tamamlandı (kill nedeniyle exit {}): {}",
                code,
                app_name
            );
        }
        if let Some(path) = check_path.as_deref().filter(|p| !p.trim().is_empty()) {
            let mut found = false;
            for _ in 0..10 {
                if check_path_exists(path.to_string()) {
                    found = true;
                    break;
                }
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            }
            if !found {
                let msg = format!(
                    "{} kurulumu doğrulanamadı: beklenen dosya bulunamadı ({})",
                    app_name, path
                );
                log::error!("{}", msg);
                return Err(msg);
            }
        }

        if let Some(cmd) = post_install_cmd {
            log::info!("Kurulum sonrası komut çalıştırılıyor: {}", cmd);
            let _ = window.emit(
                "backend-log",
                serde_json::json!({
                    "msg": format!("{}: ek paketler hazırlanıyor...", app_name),
                    "log_type": "process"
                }),
            );

            let spawn_result = tokio::process::Command::new("powershell")
                .creation_flags(CREATE_NO_WINDOW)
                .args(powershell_encoded_command_args(&cmd))
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn();

            match spawn_result {
                Ok(mut child) => {
                    if let Some(stdout) = child.stdout.take() {
                        let window_clone = window.clone();
                        tokio::spawn(async move {
                            use tokio::io::AsyncBufReadExt;
                            let mut lines = tokio::io::BufReader::new(stdout).lines();
                            while let Ok(Some(line)) = lines.next_line().await {
                                let trimmed = line.trim().to_string();
                                if !trimmed.is_empty() {
                                    log::info!("[post_install] {}", trimmed);
                                    let _ = window_clone.emit(
                                        "backend-log",
                                        serde_json::json!({
                                            "msg": trimmed,
                                            "log_type": "process"
                                        }),
                                    );
                                }
                            }
                        });
                    }
                    let _ = child.wait().await;
                }
                Err(e) => {
                    log::error!("post_install_cmd başlatılamadı: {}", e);
                }
            }
        }

        log::info!("Kurulum başarıyla tamamlandı: {}", app_name);

        if let Some(path) = shortcut_path {
            let _ = copy_shortcut_to_desktop(&path);
        }
        if let Some(lp) = launch_path.as_deref() {
            let expanded = expand_env_vars(lp);
            if std::path::Path::new(&expanded).exists() {
                if create_desktop_shortcut.unwrap_or(false) {
                    let _ = create_desktop_shortcut_fn(&expanded, &app_name);
                }
                if create_start_menu_shortcut.unwrap_or(false) {
                    let _ = create_start_menu_shortcut_fn(&expanded, &app_name);
                }
            }
        }
        let _ = window.emit(
            "install-progress",
            serde_json::json!({
                "package_id": package_id,
                "percentage": 100,
                "message": format!("{} başarıyla kuruldu.", app_name)
            }),
        );
        Ok(format!("{} başarıyla kuruldu.", app_name))
    } else {
        let code = install_status.code().unwrap_or(-1);
        log::error!("Kurulum başarısız ({}): Çıkış kodu {}", app_name, code);
        Err(format!("Kurulum hatası: Çıkış kodu {}", code))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clean_version_strips_v_prefix() {
        assert_eq!(clean_version("v1.2.3"), "1.2.3");
        assert_eq!(clean_version("V1.2.3"), "1.2.3");
        assert_eq!(clean_version("1.2.3"), "1.2.3");
    }

    #[test]
    fn clean_version_strips_pre_release_and_build() {
        assert_eq!(clean_version("1.2.3-beta.1"), "1.2.3");
        assert_eq!(clean_version("1.2.3+build.42"), "1.2.3");
        assert_eq!(clean_version("v2.0.0-rc1"), "2.0.0");
    }

    #[test]
    fn clean_version_trims_whitespace() {
        assert_eq!(clean_version("  v1.2.3  "), "1.2.3");
    }

    #[test]
    fn clean_version_normalizes_pe_comma_format() {
        assert_eq!(clean_version("2, 19, 0, 0"), "2.19");
        assert_eq!(clean_version("1, 0, 0, 0"), "1.0");
        assert_eq!(clean_version("3, 14, 1, 5"), "3.14.1.5");
    }

    #[test]
    fn clean_version_strips_trailing_comma_legacy() {
        assert_eq!(clean_version("2,"), "2");
    }

    #[test]
    fn clean_version_handles_empty() {
        assert_eq!(clean_version(""), "");
    }

    #[test]
    fn expand_env_vars_replaces_powershell_placeholder() {
        std::env::set_var("APPDATA", "C:\\Users\\Test\\AppData\\Roaming");
        assert_eq!(
            expand_env_vars("$env:AppData\\StashZero"),
            "C:\\Users\\Test\\AppData\\Roaming\\StashZero"
        );
    }

    #[test]
    fn expand_env_vars_replaces_percent_syntax() {
        std::env::set_var("STASH_ZERO_TEST_VAR", "C:\\TestRoot");
        assert_eq!(
            expand_env_vars("%STASH_ZERO_TEST_VAR%\\bin"),
            "C:\\TestRoot\\bin"
        );
    }

    #[test]
    fn expand_env_vars_leaves_unknown_var_untouched() {
        let input = "%STASH_ZERO_DEFINITELY_MISSING_VAR%\\bin";
        // When the var doesn't resolve, the loop should bail out without panicking.
        let out = expand_env_vars(input);
        assert!(out.contains("STASH_ZERO_DEFINITELY_MISSING_VAR"));
    }

    #[test]
    fn expand_env_vars_passes_through_plain_path() {
        assert_eq!(expand_env_vars("C:\\plain\\path"), "C:\\plain\\path");
    }
}
