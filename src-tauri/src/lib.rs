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
use std::sync::Arc;
use std::time::Instant;
use once_cell::sync::Lazy;
use std::os::windows::process::CommandExt;
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex as TokioMutex;

const CREATE_NO_WINDOW: u32 = 0x08000000;

// Global interactive script stdin + child handle
static SCRIPT_STDIN: Lazy<Arc<TokioMutex<Option<tokio::process::ChildStdin>>>> = Lazy::new(|| Arc::new(TokioMutex::new(None)));
static SCRIPT_CHILD: Lazy<Arc<TokioMutex<Option<tokio::process::Child>>>> = Lazy::new(|| Arc::new(TokioMutex::new(None)));

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
    dns_servers: String,
    os_full_name: String,
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
    dns_servers: String,
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
        
        let letter_only = mount_point.split(':').next().unwrap_or("").to_string().to_uppercase();
        let lookup_key = format!("{}:", letter_only);
        
        let mut model = "Bilinmeyen Sürücü".to_string();
        let mut bus = "Bilinmeyen".to_string();
        let mut media = "Bilinmeyen".to_string();

        if let Some(si) = static_info_ref {
            let disk_id = si.drive_to_disk.get(&lookup_key).cloned().unwrap_or("Bilinmeyen".to_string());
            if let Some((m, b, med)) = si.phys_map.get(&disk_id).cloned() {
                model = m;
                bus = b;
                media = med;
            }

            // High-priority override for known virtual drives like Google Drive
            let upper_name = name.to_uppercase();
            let upper_mount = mount_point.to_uppercase();
            if upper_name.contains("GOOGLE") || upper_mount.contains("GOOGLE") {
                model = "Google Drive".to_string();
                bus = "Sanal".to_string();
                media = "Bulut Depolama".to_string();
            } else if model == "Bilinmeyen Sürücü" {
                if mount_point.starts_with("\\") {
                    model = "Ağ Sürücüsü".to_string();
                    bus = "Ağ".to_string();
                    media = "Ağ Paylaşımı".to_string();
                }
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
        os_version: static_info_ref.map(|s| s.os_full_name.clone()).unwrap_or_else(|| sys.long_os_version().unwrap_or_else(|| "Unknown Windows".to_string())),
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
        dns_servers: static_info_ref.map(|s| s.dns_servers.clone()).unwrap_or("Tespit ediliyor...".to_string()),
        disks: disks_info,
    }
}

// Helper to gather static info once
fn prefetch_static_info() {
    tauri::async_runtime::spawn(async move {
        // GPU
        let gpu = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $v = Get-CimInstance Win32_VideoController | Select-Object -First 1; $p = Get-CimInstance Win32_PnPEntity | Where-Object { $_.ClassGuid -eq '{4d36e968-e325-11ce-bfc1-08002be10318}' -and $_.Present -eq $true } | Select-Object -First 1; $gn = if ($p.Name) { $p.Name } else { $v.Caption }; \"$($gn)\""])
            .output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or("Bilinmeyen GPU".to_string());
            
        // Mobo
        let mb = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-CimInstance Win32_BaseBoard | ForEach-Object { \"$($_.Manufacturer) $($_.Product)\" }"])
            .output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or("Bilinmeyen Anakart".to_string());

        let dns = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $cfg = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true -and $_.DNSServerSearchOrder -ne $null }; if ($cfg) { ($cfg | Select-Object -First 1).DNSServerSearchOrder -join ', ' } else { 'Bilinmeyen' }"])
            .output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or("Bilinmeyen".to_string());

        // BIOS
        let bios = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-CimInstance Win32_BIOS | ForEach-Object { \"$($_.SMBIOSBIOSVersion) ($($_.ReleaseDate.ToString('dd.MM.yyyy')))\" }"])
            .output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or("Bilinmeyen BIOS".to_string());

        let os_full = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $os = Get-CimInstance Win32_OperatingSystem; $ver = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion' -Name DisplayVersion; $cap = $os.Caption -replace 'Microsoft ', ''; \"$($cap) ($($os.OSArchitecture)) ($($ver.DisplayVersion))\""])
            .output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or("Windows".to_string());

        // Features (UEFI, SecureBoot, TPM, HVCI)
        let f_script = r#"
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
            $uefi = $false; 
            if (Test-Path "HKLM:\System\CurrentControlSet\Control\SecureBoot\State") { 
                $uefi = $true 
            } elseif (Test-Path "$env:windir\System32\winload.efi") {
                $uefi = $true
            } else {
                $opt = (Get-ItemProperty "HKLM:\System\CurrentControlSet\Control" -ErrorAction SilentlyContinue).SystemStartOptions
                if ($opt -like "*UEFI*") { $uefi = $true }
            }
            $sb = $false; 
            if (Test-Path "HKLM:\System\CurrentControlSet\Control\SecureBoot\State") { 
                $sb = (Get-ItemProperty "HKLM:\System\CurrentControlSet\Control\SecureBoot\State").UEFISecureBootEnabled -eq 1 
            }
            $tpm = $false; try { if ((Get-Tpm -ErrorAction SilentlyContinue).TpmPresent) { $tpm = $true } } catch {}
            $hvci = $false; 
            $hvci_val = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" -ErrorAction SilentlyContinue).Enabled
            if ($hvci_val -eq 1) { $hvci = $true }
            "$($uefi.ToString().ToLower())|$($sb.ToString().ToLower())|$($tpm.ToString().ToLower())|$($hvci.ToString().ToLower())"
        "#;
        let features = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", f_script])
            .output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or("false|false|false|false".to_string());
        
        let f_parts: Vec<&str> = features.split('|').collect();
        let uefi = f_parts.get(0).unwrap_or(&"false").trim().to_lowercase() == "true";
        let sb = f_parts.get(1).unwrap_or(&"false").trim().to_lowercase() == "true";
        let tpm = f_parts.get(2).unwrap_or(&"false").trim().to_lowercase() == "true";
        let hvci = f_parts.get(3).unwrap_or(&"false").trim().to_lowercase() == "true";

        // Advanced Disk Map (Physical -> Logical)
        let phys_script = r#"
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
            $results = @()
            # Physical disks mapping
            Get-CimInstance Win32_DiskDrive | ForEach-Object {
                $disk = $_
                $parts = Get-CimInstance -Query "ASSOCIATORS OF {Win32_DiskDrive.DeviceID='$($disk.DeviceID)'} WHERE AssocClass=Win32_DiskDriveToDiskPartition"
                $logical = $parts | ForEach-Object { Get-CimInstance -Query "ASSOCIATORS OF {Win32_DiskPartition.DeviceID='$($_.DeviceID)'} WHERE AssocClass=Win32_LogicalDiskToPartition" }
                $logicalIds = ($logical.DeviceID -join ',')
                $results += "$($disk.Index)|$($disk.Model)|$($disk.InterfaceType)|$($logicalIds)"
            }
            # Virtual/Other drives mapping
            Get-CimInstance Win32_LogicalDisk | ForEach-Object {
                $ld = $_
                if ($results -notlike "*$($ld.DeviceID)*") {
                    $type = switch($ld.DriveType) { 2 {"Taşınabilir"} 3 {"Yerel"} 4 {"Ağ"} 5 {"CD/DVD"} default {"Sanal"} }
                    $vName = if ($ld.VolumeName) { $ld.VolumeName } else { "Mantıksal Sürücü" }
                    # Try to find physical disk for this logical drive to show model
                    $pMode = ""
                    try {
                        $p = Get-Partition -DriveLetter $ld.DeviceID.Replace(':', '') -ErrorAction SilentlyContinue
                        if ($p) {
                            $d = Get-Disk -Number $p.DiskNumber -ErrorAction SilentlyContinue
                            if ($d) { $pMode = " - $($d.Model)" }
                        }
                    } catch {}
                    $results += "$($ld.DeviceID)|$vName$pMode|$type|$($ld.DeviceID)"
                }
            }
            $results | ForEach-Object { $_ }
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
            dns_servers: dns,
            os_full_name: os_full,
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
async fn uninstall_portable(url: String, app_name: String) -> Result<String, String> {
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
async fn launch_portable(url: String, app_name: Option<String>, launch_file: Option<String>) -> Result<(), String> {
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
async fn run_ps_script(script: String) -> Result<(), String> {
    let escaped_script = script.replace("'", "''");
    
    std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args([
            "-NoProfile",
            "-Command",
            &format!("Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-Command','{}' -Verb RunAs -WindowStyle Hidden", escaped_script)
        ])
        .spawn()
        .map_err(|e| format!("Betik başlatılamadı: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn run_ps_script_logged(window: TauriWindow, script: String) -> Result<(), String> {
    use tokio::io::AsyncBufReadExt;

    // Kill any existing interactive session
    {
        let mut child_guard = SCRIPT_CHILD.lock().await;
        if let Some(mut old) = child_guard.take() {
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
        .map_err(|e| format!("Betik başlatılamadı: {}", e))?;

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
async fn send_script_input(input: String) -> Result<(), String> {
    let mut guard = SCRIPT_STDIN.lock().await;
    if let Some(ref mut stdin) = *guard {
        stdin.write_all(format!("{}\n", input).as_bytes()).await
            .map_err(|e| format!("Girdi gönderilemedi: {}", e))?;
        stdin.flush().await.map_err(|e| format!("Flush hatası: {}", e))?;
        Ok(())
    } else {
        Err("Aktif oturum yok.".to_string())
    }
}

#[tauri::command]
async fn kill_script() -> Result<(), String> {
    let mut child_guard = SCRIPT_CHILD.lock().await;
    if let Some(mut c) = child_guard.take() {
        let _ = c.kill().await;
    }
    let mut stdin_guard = SCRIPT_STDIN.lock().await;
    *stdin_guard = None;
    Ok(())
}

#[tauri::command]
async fn open_drive(path: String) -> Result<(), String> {
    std::process::Command::new("explorer.exe")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Klasör açılamadı: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn set_dns(dns: Vec<String>) -> Result<String, String> {
    let dns_str = dns.iter().map(|s| format!("'{}'", s)).collect::<Vec<_>>().join(",");
    let ps_cmd = format!(
        "$dnsArray = @({}); $adapters = Get-NetAdapter | Where-Object {{ $_.Status -eq 'Up' }}; foreach ($a in $adapters) {{ Set-DnsClientServerAddress -InterfaceAlias $a.Name -ServerAddresses $dnsArray -ErrorAction SilentlyContinue; netsh interface ip set dns name=\"\"\"$($a.Name)\"\"\" source=static address=\"\"\"$($dnsArray[0])\"\"\" validate=no 2>$null; if ($dnsArray[1]) {{ netsh interface ip add dns name=\"\"\"$($a.Name)\"\"\" address=\"\"\"$($dnsArray[1])\"\"\" index=2 validate=no 2>$null }} }}",
        dns_str
    );

    // PowerShell -EncodedCommand requires UTF-16LE Base64
    use base64::{Engine as _, engine::general_purpose};
    let utf16le_bytes: Vec<u8> = ps_cmd.encode_utf16().flat_map(|c| c.to_le_bytes()).collect();
    let encoded_cmd = general_purpose::STANDARD.encode(&utf16le_bytes);

    let script = format!(
        "Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand','{}' -Verb RunAs -Wait -WindowStyle Hidden",
        encoded_cmd
    );

    let output = std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", &script])
        .output()
        .map_err(|e| format!("PowerShell hatası: {}", e))?;

    if output.status.success() {
        if let Ok(mut guard) = STATIC_SYS_INFO.lock() {
            if let Some(si) = guard.as_mut() {
                si.dns_servers = dns.join(", ");
            }
        }
        Ok(format!("DNS başarıyla '{}' olarak güncellendi.", dns.join(", ")))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[tauri::command]
async fn reset_dns() -> Result<String, String> {
    let ps_cmd = "$adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceAlias $a.Name -ResetServerAddresses -ErrorAction SilentlyContinue; netsh interface ip set dns name=\"\"\"$($a.Name)\"\"\" source=dhcp 2>$null }";

    use base64::{Engine as _, engine::general_purpose};
    let utf16le_bytes: Vec<u8> = ps_cmd.encode_utf16().flat_map(|c| c.to_le_bytes()).collect();
    let encoded_cmd = general_purpose::STANDARD.encode(&utf16le_bytes);

    let script = format!(
        "Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand','{}' -Verb RunAs -Wait -WindowStyle Hidden",
        encoded_cmd
    );

    let output = std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", &script])
        .output()
        .map_err(|e| format!("PowerShell hatası: {}", e))?;

    if output.status.success() {
        
        
        if let Ok(mut guard) = STATIC_SYS_INFO.lock() {
            if let Some(si) = guard.as_mut() {
                si.dns_servers = "Otomatik (DHCP)".to_string();
            }
        }
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
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
            open_drive,
            set_dns,
            reset_dns,
            run_ps_script,
            run_ps_script_logged,
            send_script_input,
            kill_script,
            close_splashscreen
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn get_installed_winget_ids() -> Result<Vec<(String, String)>, String> {
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
async fn install_exe_from_url(window: TauriWindow, url: String, package_id: String, app_name: String, is_portable: bool) -> Result<String, String> {
    let _ = window.emit("install-progress", serde_json::json!({
        "package_id": package_id,
        "percentage": 10,
        "message": format!("{} indiriliyor...", app_name)
    }));

    let file_name = url.split('/').last().unwrap_or("setup.exe");
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
             app_dir.join(file_name)
        }
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

    let is_zip = url.to_lowercase().ends_with(".zip") || file_name.to_lowercase().ends_with(".zip");

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

        let mut unzip_cmd = tokio::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args([
                "-NoProfile",
                "-Command",
                &format!("tar -xf '{}' -C '{}'", target_path.to_str().unwrap(), extract_path.to_str().unwrap())
            ])
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Ayıklama başlatılamadı: {}", e))?;

        let output = unzip_cmd.wait_with_output().await.map_err(|e| format!("Ayıklama hatası: {}", e))?;
        if output.status.success() {
            let _ = window.emit("install-progress", serde_json::json!({
                "package_id": package_id,
                "percentage": 100,
                "message": format!("{} başarıyla C:\\StashZero klasörüne ayıklandı.", app_name)
            }));
            return Ok(format!("{} başarıyla C:\\StashZero klasörüne ayıklandı.", app_name));
        } else {
            let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!("Ayıklama başarısız: {}", if err_msg.is_empty() { "Bilinmeyen PowerShell hatası".to_string() } else { err_msg }));
        }
    }

    if is_portable {
        let _ = window.emit("install-progress", serde_json::json!({
            "package_id": package_id,
            "percentage": 100,
            "message": format!("{} başarıyla C:\\StashZero klasörüne indirildi.", app_name)
        }));
        return Ok(format!("{} başarıyla C:\\StashZero klasörüne indirildi.", app_name));
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
