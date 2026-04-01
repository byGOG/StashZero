use serde::Serialize;
use std::fs;
use std::path::Path;

use base64::Engine;
use sha2::{Sha256, Digest};
use std::io::Read;
use tauri::Manager;
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
    name: String,         // Display name (prefix stripped)
    path: String,         // Full path to the file
    icon_b64: Option<String>,
    version: Option<String>,
    category: String,     // Category name from subfolder, or "Genel"
    order: i32,           // Numeric prefix for sorting (default 999)
    category_order: i32,  // Numeric prefix of the category folder (default 999)
    size_bytes: u64,
    description: Option<String>,
    dependencies: Vec<String>,
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

/// Scan a single directory for installer files, assigning them a category and order.
fn scan_dir_for_installers(
    app: &tauri::AppHandle,
    dir: &Path,
    category: &str,
    category_order: i32,
    installers: &mut Vec<Installer>,
) {
    let cache_dir = app.path().app_data_dir().unwrap_or_default().join("cache");
    if !cache_dir.exists() {
        fs::create_dir_all(&cache_dir).ok();
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext = match path.extension() {
            Some(e) => e.to_string_lossy().to_lowercase(),
            None => continue,
        };
        if ext != "exe" && ext != "msi" {
            continue;
        }
        let raw_name = match path.file_name() {
            Some(n) => n.to_string_lossy().into_owned(),
            None => continue,
        };

        let path_str = path.to_string_lossy().into_owned();
        let path_hash = get_path_hash(&path_str);
        let cache_file = cache_dir.join(format!("{}.png", path_hash));

        let (order, clean_name_with_ext) = parse_order_prefix(&raw_name);
        let display_name = strip_extension(&clean_name_with_ext);

        // Versioning
        let version = if ext == "exe" { get_file_version(&path_str) } else { None };

        // Metadata extraction
        let size_bytes = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        
        let desc_path = path.with_extension("txt");
        let description = if desc_path.exists() {
            fs::read_to_string(desc_path).ok().map(|s| s.trim().to_string())
        } else { None };

        let deps_path = path.with_extension("deps.json");
        let dependencies = if deps_path.exists() {
            fs::read_to_string(deps_path)
                .ok()
                .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
                .unwrap_or_default()
        } else { Vec::new() };

        // Extract icon with caching
        let mut icon_b64 = None;
        if ext == "exe" {
            if cache_file.exists() {
                if let Ok(data) = fs::read(&cache_file) {
                    icon_b64 = Some(base64::engine::general_purpose::STANDARD.encode(&data));
                }
            } else if let Ok(png_data) = win_icon_extractor::extract_icon_png(&path_str) {
                fs::write(&cache_file, &png_data).ok();
                icon_b64 = Some(base64::engine::general_purpose::STANDARD.encode(&png_data));
            }
        }

        installers.push(Installer {
            name: display_name,
            path: path_str,
            icon_b64,
            version,
            category: category.to_string(),
            order,
            category_order,
            size_bytes,
            description,
            dependencies,
        });
    }
}

#[tauri::command]
fn get_installers(app: tauri::AppHandle, dir_path: String) -> Result<Vec<Installer>, String> {
    let root = Path::new(&dir_path);
    if !root.is_dir() {
        return Err("Geçersiz klasör yolu".to_string());
    }

    let mut installers: Vec<Installer> = Vec::new();

    // First, scan root-level files (category = "Genel")
    scan_dir_for_installers(&app, root, "Genel", 999, &mut installers);

    // Then, scan subdirectories as categories
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            let sub_path = entry.path();
            if sub_path.is_dir() {
                let folder_name = match sub_path.file_name() {
                    Some(n) => n.to_string_lossy().into_owned(),
                    None => continue,
                };
                let (cat_order, cat_name) = parse_order_prefix(&folder_name);
                scan_dir_for_installers(&app, &sub_path, &cat_name, cat_order, &mut installers);
            }
        }
    }

    // Sort: first by category_order, then by order within category, then alphabetically
    installers.sort_by(|a, b| {
        a.category_order
            .cmp(&b.category_order)
            .then(a.order.cmp(&b.order))
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(installers)
}

#[tauri::command]
async fn run_installer(path: String, custom_args: Option<String>) -> Result<String, String> {
    let p = Path::new(&path);
    let ext = p
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    // Build silent install arguments
    let (program, args): (String, Vec<String>) = if ext == "msi" {
        (
            "msiexec".to_string(),
            vec![
                "/i".to_string(),
                path.clone(),
                "/qn".to_string(),
                "/norestart".to_string(),
            ],
        )
    } else {
        let base_args = vec!["/S".to_string(), "/VERYSILENT".to_string(), "/SUPPRESSMSGBOXES".to_string(), "/NORESTART".to_string()];
        let final_args = if let Some(c) = custom_args {
            c.split_whitespace().map(|s| s.to_string()).collect()
        } else {
            base_args
        };
        (path.clone(), final_args)
    };

    let ps_args_str = args
        .iter()
        .map(|a| format!("'{}'", a))
        .collect::<Vec<_>>()
        .join(",");

    let ps_script = format!(
        "Start-Process -FilePath '{}' -ArgumentList {} -Verb RunAs -Wait",
        program, ps_args_str
    );

    let output = tokio::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .output()
        .await
        .map_err(|e| format!("Kurulum başlatılamadı: {}", e))?;

    if output.status.success() {
        Ok("Kurulum tamamlandı".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("canceled") || stderr.contains("The operation was canceled") {
            Err("Kullanıcı yönetici iznini reddetti".to_string())
        } else {
            Err(format!("Kurulum hatası: {}", stderr))
        }
    }
}

#[tauri::command]
async fn run_post_install_script(dir_path: String) -> Result<String, String> {
    let root = Path::new(&dir_path);
    let script_path = root.join("post-install.ps1");
    
    if !script_path.exists() {
        return Ok("Post-install script bulunamadı, atlanıyor.".to_string());
    }

    let ps_script = format!(
        "Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','{}' -Verb RunAs -Wait",
        script_path.to_string_lossy()
    );

    let output = tokio::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .output()
        .await
        .map_err(|e| format!("Post-install başlatılamadı: {}", e))?;

    if output.status.success() {
        Ok("Post-install işlemi başarıyla tamamlandı".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Post-install hatası: {}", stderr))
    }
}

#[tauri::command]
fn clear_icon_cache(app: tauri::AppHandle) -> Result<String, String> {
    let cache_dir = app.path().app_data_dir().unwrap_or_default().join("cache");
    if cache_dir.exists() {
        fs::remove_dir_all(&cache_dir).map_err(|e| e.to_string())?;
        fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    }
    Ok("Cache temizlendi".to_string())
}

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

    // Local IP detection
    let mut local_ip = String::from("127.0.0.1");
    for (name, network) in sys.networks() {
        // Skip common virtual/loopback adapters
        if !name.to_lowercase().contains("virtual") && !name.to_lowercase().contains("pseudo") {
             // sysinfo 0.29 doesn't provide IP easily, users usually want first non-loopback
             // We'll return the name or just a placeholder for now as 0.29 IP is complex
             local_ip = name.clone();
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

#[tauri::command]
fn get_disk_usage(dir_path: String) -> DiskUsage {
    let mut sys = System::new_all();
    sys.refresh_disks_list();
    
    let path = Path::new(&dir_path);
    // On Windows, canonicalize might fail if path doesn't exist or is relative, 
    // but dir_path should be absolute.
    let absolute = fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    
    for disk in sys.disks() {
        if absolute.starts_with(disk.mount_point()) {
            return DiskUsage {
                free: disk.available_space(),
                total: disk.total_space(),
            };
        }
    }
    
    // Fallback search by drive letter
    if let Some(letter) = dir_path.get(..3) {
       for disk in sys.disks() {
          if disk.mount_point().to_string_lossy().starts_with(letter) {
             return DiskUsage {
                free: disk.available_space(),
                total: disk.total_space(),
             };
          }
       }
    }
    
    DiskUsage { free: 0, total: 0 }
}

#[tauri::command]
fn delete_installer(path: String) -> Result<String, String> {
    fs::remove_file(path).map_err(|e| e.to_string())?;
    Ok("Dosya silindi".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_installers, 
            run_installer, 
            run_post_install_script,
            clear_icon_cache,
            get_system_info,
            get_disk_usage,
            delete_installer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
