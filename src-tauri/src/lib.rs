use serde::Serialize;
use std::fs;
use tokio::io::{AsyncBufReadExt, BufReader};
use regex::Regex;

use sha2::{Sha256, Digest};
use tauri::Manager;
use tauri::Window as TauriWindow;
use tauri::Emitter;
use windows_sys::Win32::Storage::FileSystem::{
    GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW,
};
use sysinfo::{System, SystemExt, CpuExt, DiskExt, NetworkExt, NetworksExt};
use std::sync::Mutex;
use std::time::Instant;
use once_cell::sync::Lazy;
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

struct NetState {
    last_total_in: u64,
    last_total_out: u64,
    last_time: Instant,
}

static NET_STATE: Lazy<Mutex<NetState>> = Lazy::new(|| {
    Mutex::new(NetState {
        last_total_in: 0,
        last_total_out: 0,
        last_time: Instant::now(),
    })
});

struct StaticSystemInfo {
    gpu_model: String,
    motherboard: String,
    bios_info: String,
    uefi_boot: bool,
    secure_boot: bool,
    tpm_status: bool,
    hvci_status: bool,
    phys_map: std::collections::HashMap<String, (String, String, String)>,
    drive_to_disk: std::collections::HashMap<String, String>,
}

static STATIC_SYS_INFO: Lazy<Mutex<Option<StaticSystemInfo>>> = Lazy::new(|| Mutex::new(None));

#[tauri::command]
async fn close_splashscreen(window: tauri::Window) {
  // Get windows
  if let Some(splash_window) = window.get_webview_window("splash") {
    splash_window.close().unwrap();
  }
  if let Some(main_window) = window.get_webview_window("main") {
    main_window.show().unwrap();
    main_window.maximize().unwrap();
  }
}

#[derive(Serialize, Clone)]
pub struct Installer {
    name: String,         // Display name
    path: String,         // Full path or ID
    icon_b64: Option<String>,
    version: Option<String>,
    category: String,
    order: i32,
    category_order: i32,
    size_bytes: u64,
    description: Option<String>,
    dependencies: Vec<String>,
}

#[derive(Serialize)]
pub struct DiskInfo {
    name: String,
    mount_point: String,
    total_space: u64,
    available_space: u64,
    model: String,
    bus_type: String,
    media_type: String,
}

#[derive(Serialize)]
pub struct SystemInfo {
    cpu_usage: f32,
    total_memory: u64,
    used_memory: u64,
    os_version: String,
    disk_usage: f32, // Overall or first disk
    cpu_model: String,
    hostname: String,
    uptime: u64,
    kernel_version: String,
    total_processes: u32,
    net_in: f32,
    net_out: f32,
    local_ip: String,
    swap_total: u64,
    swap_used: u64,
    gpu_model: String,
    motherboard: String,
    bios_info: String,
    uefi_boot: bool,
    secure_boot: bool,
    tpm_status: bool,
    hvci_status: bool,
    disks: Vec<DiskInfo>,
}

#[derive(Serialize)]
pub struct DiskUsage {
    free: u64,
    total: u64,
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_cpu();
    sys.refresh_memory();
    sys.refresh_disks_list();
    sys.refresh_networks_list();
    
    let mut disk_pct = 0.0;
    let mut disks_info = Vec::new();
    
    let static_info_guard = STATIC_SYS_INFO.lock().unwrap();
    
    // If static info is not yet available, we return defaults to keep UI snappy
    let static_info_ref = static_info_guard.as_ref();

    for disk in sys.disks() {
        let total = disk.total_space();
        let available = disk.available_space();
        let name = disk.name().to_string_lossy().to_string();
        let mount_point = disk.mount_point().to_string_lossy().to_string();
        
        let letter = mount_point.chars().next().unwrap_or(' ').to_string().to_uppercase();
        
        let mut model = "Unknown Drive".to_string();
        let mut bus = "Unknown".to_string();
        let mut media = "Unknown".to_string();

        if let Some(si) = static_info_ref {
            let disk_id = si.drive_to_disk.get(&letter).cloned().unwrap_or("Unknown".to_string());
            if let Some((m, b, med)) = si.phys_map.get(&disk_id).cloned() {
                model = m;
                bus = b;
                media = med;
            } else if mount_point.starts_with("\\") {
                model = "Network Drive".to_string();
                bus = "Network".to_string();
                media = "Cloud".to_string();
            }
        }

        disks_info.push(DiskInfo {
            name: if name.is_empty() { mount_point.clone() } else { name },
            mount_point,
            total_space: total,
            available_space: available,
            model,
            bus_type: bus,
            media_type: media,
        });

        if disk_pct == 0.0 && total > 0 {
            disk_pct = ((total - available) as f32 / total as f32) * 100.0;
        }
    }

    let mut total_in = 0;
    let mut total_out = 0;
    for (_iface, network) in sys.networks() {
        total_in += network.total_received();
        total_out += network.total_transmitted();
    }

    let mut net_in_kb = 0.0;
    let mut net_out_kb = 0.0;

    if let Ok(mut state) = NET_STATE.lock() {
        let now = Instant::now();
        let elapsed_sec = now.duration_since(state.last_time).as_secs_f32();
        if elapsed_sec > 0.0 && state.last_total_in > 0 {
            net_in_kb = (total_in.saturating_sub(state.last_total_in) as f32) / 1024.0 / elapsed_sec;
            net_out_kb = (total_out.saturating_sub(state.last_total_out) as f32) / 1024.0 / elapsed_sec;
        }
        state.last_total_in = total_in;
        state.last_total_out = total_out;
        state.last_time = now;
    }

    let mut local_ip = String::from("Detecting...");
    if let Some(_si) = static_info_ref {
        local_ip = "127.0.0.1".to_string();
        if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
            if socket.connect("8.8.8.8:80").is_ok() {
                if let Ok(addr) = socket.local_addr() {
                    local_ip = addr.ip().to_string();
                }
            }
        }
    }

    SystemInfo {
        cpu_usage: sys.global_cpu_info().cpu_usage(),
        total_memory: sys.total_memory(),
        used_memory: sys.used_memory(),
        os_version: sys.long_os_version().unwrap_or_else(|| "Unknown Windows".to_string()),
        disk_usage: disk_pct,
        cpu_model: sys.global_cpu_info().brand().to_string(),
        hostname: sys.host_name().unwrap_or_else(|| "PC".to_string()),
        uptime: sys.uptime(),
        kernel_version: sys.kernel_version().unwrap_or_else(|| "N/A".to_string()),
        total_processes: sys.processes().len() as u32,
        net_in: net_in_kb,
        net_out: net_out_kb,
        local_ip,
        swap_total: sys.total_swap(),
        swap_used: sys.used_swap(),
        gpu_model: static_info_ref.map(|s| s.gpu_model.clone()).unwrap_or("Detecting...".to_string()),
        motherboard: static_info_ref.map(|s| s.motherboard.clone()).unwrap_or("Detecting...".to_string()),
        bios_info: static_info_ref.map(|s| s.bios_info.clone()).unwrap_or("Detecting...".to_string()),
        uefi_boot: static_info_ref.map(|s| s.uefi_boot).unwrap_or(true),
        secure_boot: static_info_ref.map(|s| s.secure_boot).unwrap_or(true),
        tpm_status: static_info_ref.map(|s| s.tpm_status).unwrap_or(true),
        hvci_status: static_info_ref.map(|s| s.hvci_status).unwrap_or(true),
        disks: disks_info,
    }
}

// Helper to gather static info once
fn prefetch_static_info() {
    tauri::async_runtime::spawn(async move {
        // GPU
        let gpu = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name"])
            .output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or("Unknown GPU".to_string());
            
        // Mobo
        let mb = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", "Get-CimInstance Win32_BaseBoard | ForEach-Object { \"$($_.Manufacturer) $($_.Product)\" }"])
            .output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or("Unknown Motherboard".to_string());

        // BIOS
        let bios = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", "Get-CimInstance Win32_BIOS | Select-Object -ExpandProperty SMBIOSBIOSVersion"])
            .output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or("Unknown BIOS".to_string());

        // Features (UEFI, SecureBoot, TPM, HVCI)
        let f_script = r#"
            $uefi = $false; if (Test-Path "HKLM:\System\CurrentControlSet\Control\SecureBoot\State") { $uefi = $true }
            $sb = $false; if ($uefi) { $sb = (Get-ItemProperty "HKLM:\System\CurrentControlSet\Control\SecureBoot\State").UEFISecureBootEnabled -eq 1 }
            $tpm = $false; if (Get-Tpm -ErrorAction SilentlyContinue | Select-Object -ExpandProperty TpmPresent -ErrorAction SilentlyContinue) { $tpm = $true }
            $hvci = $false; if ((Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" -ErrorAction SilentlyContinue).Enabled -eq 1) { $hvci = $true }
            "$uefi|$sb|$tpm|$hvci"
        "#;
        let features = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", f_script])
            .output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or("false|false|false|false".to_string());
        
        let f_parts: Vec<&str> = features.split('|').collect();
        let uefi = f_parts.get(0).unwrap_or(&"false").parse().unwrap_or(false);
        let sb = f_parts.get(1).unwrap_or(&"false").parse().unwrap_or(false);
        let tpm = f_parts.get(2).unwrap_or(&"false").parse().unwrap_or(false);
        let hvci = f_parts.get(3).unwrap_or(&"false").parse().unwrap_or(false);

        // Advanced Disk Map (Physical -> Logical)
        let phys_script = r#"
            Get-CimInstance Win32_DiskDrive | ForEach-Object {
                $disk = $_
                $parts = Get-CimInstance -Query "ASSOCIATORS OF {Win32_DiskDrive.DeviceID='$($disk.DeviceID)'} WHERE AssocClass=Win32_DiskDriveToDiskPartition"
                $logical = $parts | ForEach-Object { Get-CimInstance -Query "ASSOCIATORS OF {Win32_DiskPartition.DeviceID='$($_.DeviceID)'} WHERE AssocClass=Win32_LogicalDiskToPartition" }
                "$($disk.Index)|$($disk.Model)|$($disk.InterfaceType)|$($logical.DeviceID -join ',')"
            }
        "#;
        let phys_output = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", phys_script])
            .output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or("".to_string());
        
        let mut phys_map = std::collections::HashMap::new();
        let mut drive_to_disk = std::collections::HashMap::new();
        for line in phys_output.lines() {
            let p: Vec<&str> = line.split('|').collect();
            if p.len() >= 3 {
                let index = p[0].to_string();
                let model = p[1].to_string();
                let bus = p[2].to_string();
                let drives = p.get(3).unwrap_or(&"").split(',').map(|s| s.trim().to_string()).collect::<Vec<_>>();
                
                for d in &drives {
                    if !d.is_empty() {
                        drive_to_disk.insert(d.clone(), index.clone());
                    }
                }
                phys_map.insert(index, (model, bus, drives.join(", ")));
            }
        }

        let mut guard = STATIC_SYS_INFO.lock().unwrap();
        *guard = Some(StaticSystemInfo {
            gpu_model: gpu,
            motherboard: mb,
            bios_info: bios,
            uefi_boot: uefi,
            secure_boot: sb,
            tpm_status: tpm,
            hvci_status: hvci,
            phys_map,
            drive_to_disk,
        });
    });
}

#[tauri::command]
async fn uninstall_software(path: String) -> Result<String, String> {
    if !std::path::Path::new(&path).exists() {
        return Err(format!("Kaldırma aracı bulunamadı: {}", path));
    }

    let mut uninstall_cmd = tokio::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-NoProfile",
            "-WindowStyle", "Normal",
            "-Command",
            &format!("Start-Process -FilePath '{}' -Wait -Verb RunAs", path)
        ])
        .spawn()
        .map_err(|e| format!("Kaldırma başlatılamadı: {}", e))?;

    let status = uninstall_cmd.wait().await.map_err(|e| format!("Kaldırma process error: {}", e))?;
    if status.success() {
        Ok("Uygulama başarıyla kaldırıldı.".to_string())
    } else {
        Err(format!("Kaldırma hatası: Exit code {}", status.code().unwrap_or(-1)))
    }
}

#[tauri::command]
async fn uninstall_portable(url: String) -> Result<String, String> {
    let file_name = url.split('/').last().unwrap_or("rufus.exe");
    let home = std::env::var("USERPROFILE").map_err(|_| "Desktop konumu bulunamadı".to_string())?;
    let path = std::path::PathBuf::from(home).join("Desktop").join(file_name);
    
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| format!("Dosya silinemedi: {}", e))?;
        Ok("Dosya masaüstünden başarıyla silindi.".to_string())
    } else {
        Err(format!("Dosya bulunamadı: {:?}", path))
    }
}

#[tauri::command]
async fn launch_portable(url: String) -> Result<(), String> {
    let file_name = url.split('/').last().unwrap_or("rufus.exe");
    let home = std::env::var("USERPROFILE").map_err(|_| "Desktop konumu bulunamadı".to_string())?;
    let path = std::path::PathBuf::from(home).join("Desktop").join(file_name);
    
    if path.exists() {
        std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", &format!("Start-Process -FilePath '{}'", path.to_str().unwrap())])
            .spawn()
            .map_err(|e| format!("Uygulama başlatılamadı: {}", e))?;
        Ok(())
    } else {
        Err("Dosya bulunamadı.".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            prefetch_static_info();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_installed_winget_ids,
            install_exe_from_url,
            uninstall_software,
            uninstall_portable,
            launch_portable,
            close_splashscreen
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn get_installed_winget_ids() -> Result<Vec<String>, String> {
    let ps_script = r#"
        $paths = @(
            "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
            "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
        )
        Get-ItemProperty $paths -ErrorAction SilentlyContinue | 
            Select-Object -ExpandProperty DisplayName -ErrorAction SilentlyContinue | 
            Where-Object { $_ -ne $null -and $_ -ne '' }
    "#;

    let output = tokio::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", ps_script])
        .output()
        .await
        .map_err(|e| format!("Kayıt defteri okunamadı: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut names = Vec::new();
    for line in stdout.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() { names.push(trimmed.to_string()); }
    }
    
    // Also check for portable Rufus on Desktop to show/hide the trash icon accurately
    if let Ok(home) = std::env::var("USERPROFILE") {
        let desktop_rufus = std::path::PathBuf::from(home).join("Desktop").join("rufus-4.13.exe");
        if desktop_rufus.exists() {
            names.push("rufus".to_string()); // Adds "rufus" so the frontend marks it as installed
        }
    }
    
    Ok(names)
}

#[tauri::command]
async fn install_exe_from_url(window: TauriWindow, url: String, package_id: String, app_name: String, is_portable: bool) -> Result<String, String> {
    let _ = window.emit("install-progress", serde_json::json!({
        "package_id": package_id,
        "percentage": 10,
        "message": format!("{} indiriliyor...", app_name)
    }));

    let file_name = url.split('/').last().unwrap_or("setup.exe");
    let target_path = if is_portable {
        let home = std::env::var("USERPROFILE").map_err(|_| "Desktop konumu bulunamadı".to_string())?;
        std::path::PathBuf::from(home).join("Desktop").join(file_name)
    } else {
        std::env::temp_dir().join(file_name)
    };

    let mut curl_cmd = tokio::process::Command::new("curl")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-L", "-o", target_path.to_str().unwrap(), &url])
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Curl başlatılamadı: {}", e))?;

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
    
    let status = curl_cmd.wait().await.map_err(|e| format!("Curl process error: {}", e))?;
    if !status.success() {
        return Err(format!("İndirme başarısız: Exit code {}", status.code().unwrap_or(-1)));
    }

    if is_portable {
        let _ = window.emit("install-progress", serde_json::json!({
            "package_id": package_id,
            "percentage": 100,
            "message": format!("{} başarıyla masaüstüne indirildi (Portable).", app_name)
        }));
        return Ok(format!("{} başarıyla masaüstüne indirildi.", app_name));
    }

    let _ = window.emit("install-progress", serde_json::json!({
        "package_id": package_id,
        "percentage": null,
        "message": format!("{} kuruluyor...", app_name)
    }));

    let target_str = target_path.to_str().unwrap();
    let mut install_cmd = tokio::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-NoProfile",
            "-WindowStyle", "Hidden",
            "-Command",
            &format!("Start-Process -FilePath '{}' -ArgumentList '/S' -Wait -Verb RunAs", target_str)
        ])
        .spawn()
        .map_err(|e| format!("Kurulum başlatılamadı: {}", e))?;

    let install_status = install_cmd.wait().await.map_err(|e| format!("Kurulum process error: {}", e))?;
    if install_status.success() {
        let _ = window.emit("install-progress", serde_json::json!({
            "package_id": package_id,
            "percentage": 100,
            "message": format!("{} başarıyla kuruldu.", app_name)
        }));
        Ok(format!("{} başarıyla kuruldu.", app_name))
    } else {
        Err(format!("Kurulum hatası: Exit code {}", install_status.code().unwrap_or(-1)))
    }
}
