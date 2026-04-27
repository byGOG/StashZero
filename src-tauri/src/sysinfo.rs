use once_cell::sync::Lazy;
use serde::Serialize;
use std::os::windows::process::CommandExt;
use std::sync::Mutex;
use std::time::Instant;
use sysinfo::{CpuExt, DiskExt, NetworkExt, System, SystemExt};

const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct NetState {
    pub last_total_in: u64,
    pub last_total_out: u64,
    pub last_time: Instant,
}

pub static NET_STATE: Lazy<Mutex<NetState>> = Lazy::new(|| {
    Mutex::new(NetState {
        last_total_in: 0,
        last_total_out: 0,
        last_time: Instant::now(),
    })
});

// Reusable System handle — created once, refreshed selectively per poll.
// Avoids the cost of System::new_all() which enumerates every process.
pub static SYS_HANDLE: Lazy<Mutex<System>> = Lazy::new(|| {
    let mut s = System::new();
    s.refresh_cpu();
    s.refresh_memory();
    s.refresh_networks_list();
    Mutex::new(s)
});

// Cached local IP — rarely changes; refreshed only on slow tick.
pub static LOCAL_IP_CACHE: Lazy<Mutex<String>> =
    Lazy::new(|| Mutex::new(String::from("Detecting...")));

pub struct StaticSystemInfo {
    pub gpu_model: String,
    pub motherboard: String,
    pub bios_info: String,
    pub uefi_boot: bool,
    pub secure_boot: bool,
    pub tpm_status: bool,
    pub hvci_status: bool,
    pub dns_servers: String,
    pub defender_active: bool,
    pub uac_level: i32,
    pub is_windows_dark: bool,
    pub os_full_name: String,
    pub phys_map: std::collections::HashMap<String, (String, String, String)>,
    pub drive_to_disk: std::collections::HashMap<String, String>,
}

pub static STATIC_SYS_INFO: Lazy<Mutex<Option<StaticSystemInfo>>> = Lazy::new(|| Mutex::new(None));

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
pub struct FastTelemetry {
    cpu_usage: f32,
    total_memory: u64,
    used_memory: u64,
    net_in: f32,
    net_out: f32,
    uptime: u64,
}

#[derive(Serialize)]
pub struct SlowTelemetry {
    disks: Vec<DiskInfo>,
    defender_active: bool,
    uac_level: i32,
    is_windows_dark: bool,
    dns_servers: String,
    local_ip: String,
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
    defender_active: bool,
    uac_level: i32,
    is_windows_dark: bool,
    disks: Vec<DiskInfo>,
}

fn collect_disks(sys: &System, static_info_ref: Option<&StaticSystemInfo>) -> (Vec<DiskInfo>, f32) {
    let mut disk_pct = 0.0;
    let mut disks_info = Vec::new();

    for disk in sys.disks() {
        let total = disk.total_space();
        let available = disk.available_space();
        let name = disk.name().to_string_lossy().to_string();
        let mount_point = disk.mount_point().to_string_lossy().to_string();

        let letter_only = mount_point
            .split(':')
            .next()
            .unwrap_or("")
            .to_string()
            .to_uppercase();
        let lookup_key = format!("{}:", letter_only);

        let mut model = "Bilinmeyen Sürücü".to_string();
        let mut bus = "Bilinmeyen".to_string();
        let mut media = "Bilinmeyen".to_string();

        if let Some(si) = static_info_ref {
            let disk_id = si
                .drive_to_disk
                .get(&lookup_key)
                .cloned()
                .unwrap_or("Bilinmeyen".to_string());
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
            name: if name.is_empty() {
                mount_point.clone()
            } else {
                name
            },
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

    (disks_info, disk_pct)
}

fn compute_net_speeds(sys: &System) -> (f32, f32) {
    let mut total_in = 0u64;
    let mut total_out = 0u64;
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
            net_in_kb =
                (total_in.saturating_sub(state.last_total_in) as f32) / 1024.0 / elapsed_sec;
            net_out_kb =
                (total_out.saturating_sub(state.last_total_out) as f32) / 1024.0 / elapsed_sec;
        }
        state.last_total_in = total_in;
        state.last_total_out = total_out;
        state.last_time = now;
    }

    (net_in_kb, net_out_kb)
}

fn detect_local_ip() -> String {
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = socket.local_addr() {
                return addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}

// Heavy one-shot call — used on app startup to populate the initial UI.
// Does NOT create a new System; reuses the cached handle and refreshes disks once.
#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    let mut sys = SYS_HANDLE.lock().unwrap();
    sys.refresh_cpu();
    sys.refresh_memory();
    sys.refresh_disks_list();
    sys.refresh_disks();
    sys.refresh_networks();

    let static_info_guard = STATIC_SYS_INFO.lock().unwrap();
    let static_info_ref = static_info_guard.as_ref();

    let (disks_info, disk_pct) = collect_disks(&sys, static_info_ref);
    let (net_in_kb, net_out_kb) = compute_net_speeds(&sys);

    let local_ip = if static_info_ref.is_some() {
        let ip = detect_local_ip();
        if let Ok(mut cache) = LOCAL_IP_CACHE.lock() {
            *cache = ip.clone();
        }
        ip
    } else {
        "Detecting...".to_string()
    };

    SystemInfo {
        cpu_usage: sys.global_cpu_info().cpu_usage(),
        total_memory: sys.total_memory(),
        used_memory: sys.used_memory(),
        os_version: static_info_ref
            .map(|s| s.os_full_name.clone())
            .unwrap_or_else(|| {
                sys.long_os_version()
                    .unwrap_or_else(|| "Unknown Windows".to_string())
            }),
        disk_usage: disk_pct,
        cpu_model: sys.global_cpu_info().brand().to_string(),
        hostname: sys.host_name().unwrap_or_else(|| "PC".to_string()),
        uptime: sys.uptime(),
        kernel_version: sys.kernel_version().unwrap_or_else(|| "N/A".to_string()),
        total_processes: 0,
        net_in: net_in_kb,
        net_out: net_out_kb,
        local_ip,
        swap_total: sys.total_swap(),
        swap_used: sys.used_swap(),
        gpu_model: static_info_ref
            .map(|s| s.gpu_model.clone())
            .unwrap_or("Detecting...".to_string()),
        motherboard: static_info_ref
            .map(|s| s.motherboard.clone())
            .unwrap_or("Detecting...".to_string()),
        bios_info: static_info_ref
            .map(|s| s.bios_info.clone())
            .unwrap_or("Detecting...".to_string()),
        uefi_boot: static_info_ref.map(|s| s.uefi_boot).unwrap_or(false),
        secure_boot: static_info_ref.map(|s| s.secure_boot).unwrap_or(false),
        tpm_status: static_info_ref.map(|s| s.tpm_status).unwrap_or(false),
        hvci_status: static_info_ref.map(|s| s.hvci_status).unwrap_or(false),
        dns_servers: static_info_ref
            .map(|s| s.dns_servers.clone())
            .unwrap_or("Tespit ediliyor...".to_string()),
        defender_active: static_info_ref.map(|s| s.defender_active).unwrap_or(false),
        uac_level: static_info_ref.map(|s| s.uac_level).unwrap_or(0),
        is_windows_dark: static_info_ref.map(|s| s.is_windows_dark).unwrap_or(false),
        disks: disks_info,
    }
}

// Lightweight poll — called every ~2.5s. No child processes, no disk enum, no new System.
#[tauri::command]
pub fn get_fast_telemetry() -> FastTelemetry {
    let mut sys = SYS_HANDLE.lock().unwrap();
    sys.refresh_cpu();
    sys.refresh_memory();
    sys.refresh_networks();

    let (net_in_kb, net_out_kb) = compute_net_speeds(&sys);

    FastTelemetry {
        cpu_usage: sys.global_cpu_info().cpu_usage(),
        total_memory: sys.total_memory(),
        used_memory: sys.used_memory(),
        net_in: net_in_kb,
        net_out: net_out_kb,
        uptime: sys.uptime(),
    }
}

// Medium poll — called every ~30s. Spawns child processes for UAC/Defender/theme.
#[tauri::command]
pub fn get_slow_telemetry() -> SlowTelemetry {
    let mut sys = SYS_HANDLE.lock().unwrap();
    sys.refresh_disks_list();
    sys.refresh_disks();

    let static_info_guard = STATIC_SYS_INFO.lock().unwrap();
    let static_info_ref = static_info_guard.as_ref();

    let (disks_info, _disk_pct) = collect_disks(&sys, static_info_ref);

    let local_ip = {
        let cached = LOCAL_IP_CACHE
            .lock()
            .ok()
            .map(|s| s.clone())
            .unwrap_or_default();
        if cached.is_empty() || cached == "Detecting..." || cached == "127.0.0.1" {
            let ip = detect_local_ip();
            if let Ok(mut cache) = LOCAL_IP_CACHE.lock() {
                *cache = ip.clone();
            }
            ip
        } else {
            cached
        }
    };

    SlowTelemetry {
        disks: disks_info,
        defender_active: get_dynamic_defender_status(),
        uac_level: get_dynamic_uac_level(),
        is_windows_dark: get_dynamic_windows_theme(),
        dns_servers: static_info_ref
            .map(|s| s.dns_servers.clone())
            .unwrap_or("Tespit ediliyor...".to_string()),
        local_ip,
    }
}

fn get_dynamic_uac_level() -> i32 {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let output = std::process::Command::new("reg")
        .args([
            "query",
            "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System",
            "/v",
            "ConsentPromptBehaviorAdmin",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        if text.contains("0x0") {
            return 0;
        }
        if text.contains("0x2") {
            return 3;
        }
        if text.contains("0x5") {
            let output2 = std::process::Command::new("reg")
                .args([
                    "query",
                    "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System",
                    "/v",
                    "PromptOnSecureDesktop",
                ])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
            if let Ok(out2) = output2 {
                let text2 = String::from_utf8_lossy(&out2.stdout);
                if text2.contains("0x1") {
                    return 2;
                } else {
                    return 1;
                }
            }
        }
    }
    0
}

fn get_dynamic_defender_status() -> bool {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    // Fast check via PowerShell (only one property)
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "(Get-MpComputerStatus).RealTimeProtectionEnabled",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if let Ok(out) = output {
        let res = String::from_utf8_lossy(&out.stdout).trim().to_lowercase();
        if res == "true" {
            return true;
        }
    }

    // Fallback/Secondary check via SecurityCenter2 (faster sometimes)
    let output_av = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", "$av = Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct | Where-Object { $_.displayName -like '*Defender*' }; if ($av) { $hex = [convert]::ToString($av.productState, 16).PadLeft(6, '0'); $mid = $hex.Substring(2, 2); if ($mid -eq '10' -or $mid -eq '11') { 'true' } else { 'false' } } else { 'false' }"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if let Ok(out) = output_av {
        return String::from_utf8_lossy(&out.stdout).trim().to_lowercase() == "true";
    }

    false
}

fn get_dynamic_windows_theme() -> bool {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let output = std::process::Command::new("reg")
        .args([
            "query",
            "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
            "/v",
            "AppsUseLightTheme",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        // If AppsUseLightTheme is 0, it is Dark mode
        return text.contains("0x0");
    }
    true // Default to Light if detection fails
}

// Helper to gather static info once
pub fn prefetch_static_info() {
    tauri::async_runtime::spawn(async move {
        let master_script = r#"
            [Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
            
            # GPU
            $v = Get-CimInstance Win32_VideoController | Select-Object -First 1; 
            $p = Get-CimInstance Win32_PnPEntity | Where-Object { $_.ClassGuid -eq '{4d36e968-e325-11ce-bfc1-08002be10318}' -and $_.Present -eq $true } | Select-Object -First 1; 
            $gpu = if ($p.Name) { $p.Name } else { $v.Caption };
            
            # Motherboard
            $mb = Get-CimInstance Win32_BaseBoard | ForEach-Object { "$($_.Manufacturer) $($_.Product)" };
            
            # DNS
            $cfg = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true -and $_.DNSServerSearchOrder -ne $null };
            $dns = if ($cfg) { ($cfg | Select-Object -First 1).DNSServerSearchOrder -join ', ' } else { 'Bilinmeyen' };
            
            # BIOS
            $bios = Get-CimInstance Win32_BIOS | ForEach-Object { "$($_.SMBIOSBIOSVersion) ($($_.ReleaseDate.ToString('dd.MM.yyyy')))" };
            
            # OS Full
            $os = Get-CimInstance Win32_OperatingSystem; 
            $ver = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -Name DisplayVersion; 
            $cap = $os.Caption -replace 'Microsoft ', ''; 
            $os_full = "$($cap) ($($os.OSArchitecture)) ($($ver.DisplayVersion))";
            
            # UEFI & Secure Boot Detection
            $uefi = $false;
            $sb = $false;
            try {
                # Confirm-SecureBootUEFI returns true/false if UEFI, or errors if BIOS
                $sb_check = Confirm-SecureBootUEFI -ErrorAction Stop
                $uefi = $true
                $sb = $sb_check -eq $true
            } catch {
                $uefi = $false
                # Fallback for some environments
                if (Test-Path "$env:windir\System32\winload.efi") { $uefi = $true }
            }
            
            $tpm = $false; try { if ((Get-Tpm -ErrorAction SilentlyContinue).TpmPresent) { $tpm = $true } } catch {}
            $hvci = $false; 
            $hvci_val = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" -ErrorAction SilentlyContinue).Enabled
            if ($hvci_val -eq 1) { $hvci = $true }
            
            # Defender
            $def = $false;
            try {
                $status = Get-MpComputerStatus -ErrorAction SilentlyContinue
                if ($status) { $def = $status.RealTimeProtectionEnabled -eq $true }
                else {
                    $av = Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct | Where-Object { $_.displayName -like '*Defender*' }
                    if ($av) {
                        $hexState = [convert]::ToString($av.productState, 16).PadLeft(6, '0')
                        $mid = $hexState.Substring(2, 2)
                        if ($mid -eq '10' -or $mid -eq '11') { $def = $true }
                    }
                }
            } catch { $def = $false }

            # UAC Level
            $uac_lvl = 0;
            try {
                $uac_reg = Get-ItemProperty HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System -ErrorAction SilentlyContinue
                $cpba = $uac_reg.ConsentPromptBehaviorAdmin
                $posd = $uac_reg.PromptOnSecureDesktop
                if ($cpba -eq 0) { $uac_lvl = 0 }
                elseif ($cpba -eq 5) { if ($posd -eq 0) { $uac_lvl = 1 } else { $uac_lvl = 2 } }
                elseif ($cpba -eq 2) { $uac_lvl = 3 }
            } catch { $uac_lvl = 0 }

            # Windows Theme
            $is_dark = (Get-ItemProperty HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize -ErrorAction SilentlyContinue).AppsUseLightTheme -eq 0

            $features = "$($uefi.ToString().ToLower())|$($sb.ToString().ToLower())|$($tpm.ToString().ToLower())|$($hvci.ToString().ToLower())|$($def.ToString().ToLower())|$uac_lvl|$($is_dark.ToString().ToLower())";
            
            # Disk Map
            $disk_results = @()
            Get-CimInstance Win32_DiskDrive | ForEach-Object {
                $disk = $_
                $results_line = "$($disk.Index)|$($disk.Model)|$($disk.InterfaceType)"
                $disk_results += $results_line
            }
            # Logical Disks
            $logical_results = @()
            Get-CimInstance Win32_LogicalDisk | ForEach-Object {
                $ld = $_
                $type = switch($ld.DriveType) { 2 {"Taşınabilir"} 3 {"Yerel"} 4 {"Ağ"} 5 {"CD/DVD"} default {"Sanal"} }
                $logical_results += "$($ld.DeviceID)|$($ld.VolumeName)|$($type)"
            }

            # Final output construction
            "START_DATA"
            "GPU:$gpu"
            "MOBO:$mb"
            "DNS:$dns"
            "BIOS:$bios"
            "OS:$os_full"
            "FEAT:$features"
            "DISKS_START"
            $disk_results | ForEach-Object { "D:$_" }
            "LOGICAL_START"
            $logical_results | ForEach-Object { "L:$_" }
            "END_DATA"
        "#;

        let output = std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", master_script])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
            .unwrap_or_default();

        let mut gpu = "Bilinmeyen GPU".to_string();
        let mut mb = "Bilinmeyen Anakart".to_string();
        let mut dns = "Bilinmeyen".to_string();
        let mut bios = "Bilinmeyen BIOS".to_string();
        let mut os_full = "Windows".to_string();
        let mut uefi = false;
        let mut sb = false;
        let mut tpm = false;
        let mut hvci = false;
        let mut defender = false;
        let mut uac = 0;
        let mut is_dark = false;
        let mut phys_map = std::collections::HashMap::new();
        let mut drive_to_disk = std::collections::HashMap::new();

        let mut in_data = false;
        for line in output.lines() {
            let line = line.trim();
            if line == "START_DATA" {
                in_data = true;
                continue;
            }
            if line == "END_DATA" {
                break;
            }
            if !in_data {
                continue;
            }

            if let Some(val) = line.strip_prefix("GPU:") {
                gpu = val.to_string();
            } else if let Some(val) = line.strip_prefix("MOBO:") {
                mb = val.to_string();
            } else if let Some(val) = line.strip_prefix("DNS:") {
                dns = val.to_string();
            } else if let Some(val) = line.strip_prefix("BIOS:") {
                bios = val.to_string();
            } else if let Some(val) = line.strip_prefix("OS:") {
                os_full = val.to_string();
            } else if let Some(val) = line.strip_prefix("FEAT:") {
                let f_parts: Vec<&str> = val.split('|').collect();
                uefi = f_parts.get(0).unwrap_or(&"false").trim().to_lowercase() == "true";
                sb = f_parts.get(1).unwrap_or(&"false").trim().to_lowercase() == "true";
                tpm = f_parts.get(2).unwrap_or(&"false").trim().to_lowercase() == "true";
                hvci = f_parts.get(3).unwrap_or(&"false").trim().to_lowercase() == "true";
                defender = f_parts.get(4).unwrap_or(&"false").trim().to_lowercase() == "true";
                uac = f_parts.get(5).unwrap_or(&"0").parse::<i32>().unwrap_or(0);
                is_dark = f_parts.get(6).unwrap_or(&"false").trim().to_lowercase() == "true";
            } else if let Some(val) = line.strip_prefix("D:") {
                let p: Vec<&str> = val.split('|').collect();
                if p.len() >= 3 {
                    let index = p[0].to_string();
                    phys_map.insert(
                        index.clone(),
                        (p[1].to_string(), p[2].to_string(), String::new()),
                    );
                }
            } else if let Some(val) = line.strip_prefix("L:") {
                let p: Vec<&str> = val.split('|').collect();
                if p.len() >= 3 {
                    let drive = p[0].to_string();
                    drive_to_disk.insert(drive, "0".to_string());
                }
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
            defender_active: defender,
            uac_level: uac,
            is_windows_dark: is_dark,
            dns_servers: dns,
            os_full_name: os_full,
            phys_map,
            drive_to_disk,
        });
    });
}
