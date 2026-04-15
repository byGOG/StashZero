use std::os::windows::process::CommandExt;
use crate::sysinfo::STATIC_SYS_INFO;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[tauri::command]
pub async fn set_dns(dns: Vec<String>) -> Result<String, String> {
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
pub async fn reset_dns() -> Result<String, String> {
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
