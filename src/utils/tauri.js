import { invoke } from "@tauri-apps/api/core";

export const isTauri = () => {
  return !!window.__TAURI_INTERNALS__;
};

/**
 * Safely call a Tauri command. 
 * If running in a regular browser, returns a fallback value or logs a warning.
 */
export async function safeInvoke(cmd, args = {}, fallback = null) {
  if (isTauri()) {
    try {
      return await invoke(cmd, args);
    } catch (e) {
      console.error(`Tauri invoke error [${cmd}]:`, e);
      return fallback;
    }
  } else {
    console.warn(`Browser mode: skipping Tauri command [${cmd}]`, args);
    
    // Provide specific mock data for certain common requested commands
    if (cmd === "get_system_info") {
      return {
        cpu_usage: 25 + Math.random() * 10,
        cpu_model: "AMD Ryzen 9 7950X (Browser Mock)",
        total_memory: 32 * 1024 * 1024 * 1024,
        used_memory: 12 * 1024 * 1024 * 1024,
        os_version: "Windows 11 Pro (Browser Mode)",
        gpu_model: "NVIDIA GeForce RTX 4090",
        motherboard: "ASUS ROG CROSSHAIR X670E HERO",
        bios_info: "v1602 (2025-01-15)",
        local_ip: "192.168.1.100",
        dns_servers: "1.1.1.1, 8.8.8.8",
        uefi_boot: true,
        secure_boot: true,
        net_in: 2500 + Math.random() * 500,
        net_out: 800 + Math.random() * 200,
        disks: [
          { name: "Sistem (C:)", mount_point: "C:", total_space: 1024 * 1024 * 1024 * 1024, available_space: 450 * 1024 * 1024 * 1024, model: "Samsung SSD 990 PRO 1TB", bus_type: "NVMe" },
          { name: "Depo (D:)", mount_point: "D:", total_space: 2 * 1024 * 1024 * 1024 * 1024, available_space: 1200 * 1024 * 1024 * 1024, model: "Crucial MX500 2TB", bus_type: "SATA" }
        ]
      };
    }
    
    if (cmd === "get_fast_telemetry") {
      return {
        cpu_usage: 25 + Math.random() * 10,
        total_memory: 32 * 1024 * 1024 * 1024,
        used_memory: 12 * 1024 * 1024 * 1024,
        net_in: 2500 + Math.random() * 500,
        net_out: 800 + Math.random() * 200,
        uptime: 3600,
      };
    }

    if (cmd === "get_slow_telemetry") {
      return {
        disks: [
          { name: "Sistem (C:)", mount_point: "C:", total_space: 1024 * 1024 * 1024 * 1024, available_space: 450 * 1024 * 1024 * 1024, model: "Samsung SSD 990 PRO 1TB", bus_type: "NVMe" },
          { name: "Depo (D:)", mount_point: "D:", total_space: 2 * 1024 * 1024 * 1024 * 1024, available_space: 1200 * 1024 * 1024 * 1024, model: "Crucial MX500 2TB", bus_type: "SATA" }
        ],
        defender_active: true,
        uac_level: 2,
        is_windows_dark: true,
        dns_servers: "1.1.1.1, 8.8.8.8",
        local_ip: "192.168.1.100",
      };
    }

    if (cmd === "get_installed_winget_ids") {
      return [["Google Chrome", "120.0.6099.110"], ["Firefox", "121.0"]];
    }
    
    return fallback;
  }
}
