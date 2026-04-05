use serde::Serialize;
use std::fs;
use std::path::Path;
use tokio::io::{AsyncBufReadExt, BufReader};
use regex::Regex;

use base64::Engine;
use sha2::{Sha256, Digest};
use std::io::Read;
use tauri::Manager;
use tauri::Window as TauriWindow;
use tauri::Emitter;
use tauri::Window;
use windows_sys::Win32::Storage::FileSystem::{
    GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW,
};
use sysinfo::{System, SystemExt, CpuExt, DiskExt, NetworkExt, NetworksExt};
use std::sync::Mutex;
use std::time::Instant;
use once_cell::sync::Lazy;

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
    winget_id: Option<String>, // Added for Winget support
}

#[derive(Serialize)]
pub struct SystemInfo {
    cpu_usage: f32,
    total_memory: u64,
    used_memory: u64,
    os_version: String,
    disk_usage: f32,
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
}

#[derive(Serialize)]
pub struct DiskUsage {
    free: u64,
    total: u64,
}

/// Strip leading numeric prefix like "01-", "2_", "03 " from a name.
/// Returns (order_number, clean_name).
fn parse_order_prefix(raw: &str) -> (i32, String) {
    let trimmed = raw.trim();
    let mut num_end = 0;
    for (i, ch) in trimmed.char_indices() {
        if ch.is_ascii_digit() {
            num_end = i + ch.len_utf8();
        } else {
            break;
        }
    }

    if num_end == 0 {
        return (999, trimmed.to_string());
    }

    let num_str = &trimmed[..num_end];
    let order = num_str.parse::<i32>().unwrap_or(999);

    // Skip separator characters after the number: '-', '_', ' ', '.'
    let rest = &trimmed[num_end..];
    let clean = rest.trim_start_matches(|c: char| c == '-' || c == '_' || c == ' ' || c == '.');
    
    if clean.is_empty() {
        return (order, trimmed.to_string());
    }

    (order, clean.to_string())
}

/// Strip file extension from name for display
fn strip_extension(name: &str) -> String {
    if let Some(pos) = name.rfind('.') {
        let ext = &name[pos + 1..];
        if ext.eq_ignore_ascii_case("exe") || ext.eq_ignore_ascii_case("msi") {
            return name[..pos].to_string();
        }
    }
    name.to_string()
}

/// Get a unique hash of a file path for cache indexing
fn get_path_hash(path: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(path.as_bytes());
    hex::encode(hasher.finalize())
}

/// Extract File Version from Windows executable
fn get_file_version(path: &str) -> Option<String> {
    use std::os::windows::ffi::OsStrExt;
    let path_wide: Vec<u16> = std::ffi::OsStr::new(path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let mut _handle: u32 = 0;
        let size = GetFileVersionInfoSizeW(path_wide.as_ptr(), &mut _handle);
        if size == 0 {
            return None;
        }

        let mut buffer = vec![0u8; size as usize];
        if GetFileVersionInfoW(path_wide.as_ptr(), 0, size, buffer.as_mut_ptr() as *mut _) == 0 {
            return None;
        }

        let mut sub_block: Vec<u16> = "\\StringFileInfo\\040904b0\\FileVersion"
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let mut value_ptr: *mut u16 = std::ptr::null_mut();
        let mut value_len: u32 = 0;

        if VerQueryValueW(
            buffer.as_ptr() as *const _,
            sub_block.as_ptr(),
            &mut value_ptr as *mut _ as *mut _,
            &mut value_len,
        ) != 0 && value_len > 0
        {
            let slice = std::slice::from_raw_parts(value_ptr, (value_len - 1) as usize);
            return Some(String::from_utf16_lossy(slice).trim().to_string());
        }
    }
    None
}

// System and Winget commands only

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_cpu();
    sys.refresh_memory();
    sys.refresh_disks_list();
    sys.refresh_networks_list();
    
    // Disk info
    let mut disk_pct = 0.0;
    if let Some(disk) = sys.disks().first() {
        let total = disk.total_space() as f32;
        let available = disk.available_space() as f32;
        if total > 0.0 {
            disk_pct = ((total - available) / total) * 100.0;
        }
    }

    // Network delta calculation (KB/s)
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
        
        if elapsed_sec > 0.0 {
            if state.last_total_in > 0 {
                net_in_kb = (total_in.saturating_sub(state.last_total_in) as f32) / 1024.0 / elapsed_sec;
                net_out_kb = (total_out.saturating_sub(state.last_total_out) as f32) / 1024.0 / elapsed_sec;
            }
        }
        
        state.last_total_in = total_in;
        state.last_total_out = total_out;
        state.last_time = now;
    }

    // Local IP detection by establishing a dummy UDP socket to identify the active routing interface
    let mut local_ip = String::from("127.0.0.1");
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = socket.local_addr() {
                local_ip = addr.ip().to_string();
            }
        }
    }

    SystemInfo {
        cpu_usage: sys.global_cpu_info().cpu_usage(),
        total_memory: sys.total_memory(),
        used_memory: sys.used_memory(),
        os_version: sys.long_os_version().unwrap_or_else(|| sys.os_version().unwrap_or_else(|| "Unknown".to_string())),
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
    }
}

// Disk usage removed as it is folder context sensitive

#[tauri::command]
async fn install_winget_package(window: TauriWindow, package_id: String) -> Result<String, String> {
    // winget install <id> --accept-package-agreements --accept-source-agreements
    // winget install <id> --accept-package-agreements --accept-source-agreements
    let mut child = tokio::process::Command::new("winget")
        .args(["install", "--id", &package_id, "--exact", "--accept-package-agreements", "--accept-source-agreements"])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Winget başlatılamadı: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut stderr_reader = BufReader::new(stderr).lines();

    // Read stdout and stderr concurrently
    let window_clone = window.clone();
    let package_id_clone = package_id.clone();
    let stdout_task = tokio::spawn(async move {
        while let Ok(Some(line)) = stdout_reader.next_line().await {
            // Parse progress percentage from line
            if let Some(caps) = regex::Regex::new(r"(\d+)%").unwrap().captures(&line) {
                if let Ok(percentage) = caps[1].parse::<u32>() {
                    let _ = window_clone.emit("install-progress", serde_json::json!({
                        "package_id": package_id_clone,
                        "percentage": percentage,
                        "message": line
                    }));
                }
            } else if line.contains("Downloading") || line.contains("Installing") || line.contains("Successfully") {
                let _ = window_clone.emit("install-progress", serde_json::json!({
                    "package_id": package_id_clone,
                    "percentage": null,
                    "message": line
                }));
            }
        }
    });

    let stderr_task = tokio::spawn(async move {
        while let Ok(Some(line)) = stderr_reader.next_line().await {
            // Log errors if any
            let _ = window.emit("install-progress", format!("Error: {}", line));
        }
    });

    // Wait for process to complete
    let status = child.wait().await.map_err(|e| format!("Process wait error: {}", e))?;

    // Wait for readers to finish
    let _ = stdout_task.await;
    let _ = stderr_task.await;

    if status.success() {
        Ok(format!("{} başarıyla kuruldu", package_id))
    } else {
        Err(format!("Winget hatası: Exit code {}", status.code().unwrap_or(-1)))
    }
}

#[tauri::command]
async fn uninstall_winget_package(window: TauriWindow, package_id: String) -> Result<String, String> {
    let mut child = tokio::process::Command::new("winget")
        .args(["uninstall", "--id", &package_id, "--exact", "--silent", "--accept-source-agreements"])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Winget başlatılamadı: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let mut stdout_reader = tokio::io::BufReader::new(stdout).lines();
    let mut stderr_reader = tokio::io::BufReader::new(stderr).lines();

    let window_clone = window.clone();
    let package_id_clone = package_id.clone();
    
    let stdout_task = tokio::spawn(async move {
        while let Ok(Some(line)) = stdout_reader.next_line().await {
            if let Some(caps) = regex::Regex::new(r"(\d+)%").unwrap().captures(&line) {
                if let Ok(percentage) = caps[1].parse::<u32>() {
                    let _ = window_clone.emit("install-progress", serde_json::json!({
                        "package_id": package_id_clone,
                        "percentage": percentage,
                        "message": format!("Kaldırılıyor: {}...", percentage)
                    }));
                }
            } else if line.contains("Uninstalling") || line.contains("Successfully") || line.contains("Kaldırılıyor") {
                let _ = window_clone.emit("install-progress", serde_json::json!({
                    "package_id": package_id_clone,
                    "percentage": null,
                    "message": line
                }));
            }
        }
    });

    let window_clone_err = window.clone();
    let package_id_err = package_id.clone();
    let stderr_task = tokio::spawn(async move {
        while let Ok(Some(line)) = stderr_reader.next_line().await {
            let _ = window_clone_err.emit("install-progress", serde_json::json!({
                "package_id": package_id_err,
                "percentage": null,
                "message": format!("Error: {}", line)
            }));
        }
    });

    let status = child.wait().await.map_err(|e| format!("Process wait error: {}", e))?;
    let _ = stdout_task.await;
    let _ = stderr_task.await;

    if status.success() {
        Ok(format!("{} başarıyla kaldırıldı", package_id))
    } else {
        Err(format!("Winget hatası: Exit code {}", status.code().unwrap_or(-1)))
    }
}

#[tauri::command]
async fn get_installed_winget_ids() -> Result<Vec<String>, String> {
    // Instead of using 'winget list' which is notoriously slow and fragile (e.g., throwing 0x8007139f if sources are corrupt),
    // we use a highly robust PowerShell one-liner to query the Windows Uninstall Registry keys for all installed DisplayNames.
    // This perfectly reflects what is actually installed on the system.
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
        .args(["-NoProfile", "-Command", ps_script])
        .output()
        .await
        .map_err(|e| format!("Kayıt defteri okunamadı: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut names = Vec::new();
    
    for line in stdout.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            names.push(trimmed.to_string());
        }
    }
    
    Ok(names)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            install_winget_package,
            uninstall_winget_package,
            get_installed_winget_ids
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
