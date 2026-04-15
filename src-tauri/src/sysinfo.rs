use serde::Serialize;
use std::sync::Mutex;
use std::time::Instant;
use once_cell::sync::Lazy;
use std::os::windows::process::CommandExt;
use sysinfo::{System, SystemExt, CpuExt, DiskExt, NetworkExt};

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

pub struct StaticSystemInfo {
    pub gpu_model: String,
    pub motherboard: String,
    pub bios_info: String,
    pub uefi_boot: bool,
    pub secure_boot: bool,
    pub tpm_status: bool,
    pub hvci_status: bool,
    pub dns_servers: String,
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

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
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
pub fn prefetch_static_info() {
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
