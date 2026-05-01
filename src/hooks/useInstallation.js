import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { safeInvoke } from "../utils/tauri";
import { listen } from '@tauri-apps/api/event';
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { sounds } from "../utils/audio";
import { LEGENDARY_APPS } from "../data/library";

export const useInstallation = () => {
  const [installers, setInstallers] = useState(LEGENDARY_APPS.map(a => ({ ...a, path: a.id, dependencies: [] })));
  const [selected, setSelected] = useState(new Set());
  const [installing, setInstalling] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [currentInstall, setCurrentInstall] = useState(null);
  const [installStatus, setInstallStatus] = useState({});
  const [installedApps, setInstalledApps] = useState({}); // id -> version
  const [installProgress, setInstallProgress] = useState({ done: 0, total: 0 });
  const [appProgress, setAppProgress] = useState({});
  const [logs, setLogs] = useState([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [shellType, setShellType] = useState("powershell");
  const [updatesAvailable, setUpdatesAvailable] = useState({}); // id -> { latest: string, isNewer: boolean }

  // Simple version comparison helper
  const isVersionNewer = (current, latest) => {
    if (!current || !latest) return false;
    if (current === "Kurulu" || current === "Portable" || latest === "Son Sürüm" || latest === "Web") return false;
    
    const clean = (v) => v.replace(/^v/, '').split('.').map(n => parseInt(n) || 0);
    const curParts = clean(current);
    const latParts = clean(latest);
    
    for (let i = 0; i < Math.max(curParts.length, latParts.length); i++) {
      const c = curParts[i] || 0;
      const l = latParts[i] || 0;
      if (l > c) return true;
      if (c > l) return false;
    }
    return false;
  };

  const addLog = useCallback((msg, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, msg, type }].slice(-100));
  }, []);

  // Sync installers if LEGENDARY_APPS changes (Dev/HMR)
  useEffect(() => {
    setInstallers(LEGENDARY_APPS.map(a => ({ ...a, path: a.id, dependencies: [] })));
  }, []);

  const refreshInstalledStatus = useCallback(async () => {
    try {
      const payload = installers.map(a => ({
        id: a.id,
        name: a.name,
        check_path: a.check_path || null,
      }));
      const newInstalledApps = await safeInvoke("batch_check_installations", { apps: payload }, {});
      const installedPaths = new Set();
      const updates = {};

      for (const app of installers) {
        const currentVersion = newInstalledApps[app.id];
        if (currentVersion && !app.script_cmd && !app.is_resource) {
          installedPaths.add(app.path);
          
          // Check for update
          if (isVersionNewer(currentVersion, app.version)) {
            updates[app.id] = { current: currentVersion, latest: app.version };
          }
        }
      }

      setInstalledApps(newInstalledApps);
      setUpdatesAvailable(updates);
      
      // Kurulu olanları seçili listesinden çıkar
      setSelected(prev => {
        const next = new Set(prev);
        let changed = false;
        installedPaths.forEach(path => {
          if (next.has(path) && !updates[installers.find(i => i.path === path)?.id]) {
             // If update available, keep it selectable maybe? 
             // Actually, usually users want to see it as "Update" rather than just another selection.
             // But for now, we'll keep it simple: if installed, remove from selection unless update is forced.
             next.delete(path);
             changed = true;
          }
        });
        return changed ? next : prev;
      });

    } catch (e) {
      console.error("Installation status check failed", e);
    }
  }, [installers]);

  useEffect(() => {
    refreshInstalledStatus();
  }, [refreshInstalledStatus]);

  useEffect(() => {
    const unlisten = listen('install-progress', (event) => {
      const { package_id, percentage, message } = event.payload;
      addLog(message, "process");
      if (percentage !== null) {
        setAppProgress(prev => ({ ...prev, [package_id]: percentage }));
      }
    });

    const unlistenScript = listen('script-log', (event) => {
      const { msg, log_type, session_active } = event.payload;
      addLog(msg, log_type || "process");
      if (session_active !== undefined) {
        setIsSessionActive(session_active);
      }
    });

    const unlistenBackend = listen('backend-log', (event) => {
      const { msg, log_type } = event.payload;
      addLog(msg, log_type || "info");
    });

    return () => {
      unlisten.then(f => f());
      unlistenScript.then(f => f());
      unlistenBackend.then(f => f());
    };
  }, [addLog]);

  const toggleSelect = useCallback(async (path) => {
    if (installing) return;
    
    const app = installers.find(i => i.path === path);
    if (app && installedApps[app.id] && !app.script_cmd && !app.is_resource) {
      addLog(`"${app.name}" zaten kurulu. Tekrar kurmak için önce kaldırmalısınız.`, "info");
      sounds.playError();
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    sounds.playClick();
  }, [installing, installers, installedApps, addLog]);

  const exportSelection = useCallback(async () => {
    if (selected.size === 0) {
      addLog("Dışa aktarılacak uygulama seçilmedi.", "error");
      return;
    }
    try {
      const data = JSON.stringify(Array.from(selected), null, 2);
      const path = await save({
        filters: [{ name: 'StashZero Paket', extensions: ['json'] }],
        defaultPath: 'stashzero-paket.json'
      });
      if (path) {
        await writeTextFile(path, data);
        addLog("Seçim listesi başarıyla kaydedildi.", "success");
        sounds.playSuccess();
      }
    } catch (e) {
      addLog(`Dışa aktarma hatası: ${e}`, "error");
    }
  }, [selected, addLog]);

  const importSelection = useCallback(async () => {
    if (installing) return;
    try {
      const path = await open({
        filters: [{ name: 'StashZero Paket', extensions: ['json'] }],
        multiple: false
      });
      if (path) {
        const content = await readTextFile(path);
        const list = JSON.parse(content);
        if (Array.isArray(list)) {
          // Sadece kütüphanede olan ve kurulu olmayanları seç
          const validPaths = list.filter(p => {
            const app = installers.find(i => i.path === p);
            return app && !(installedApps[app.id] && !app.script_cmd && !app.is_resource);
          });
          setSelected(new Set(validPaths));
          addLog(`${validPaths.length} uygulama listeden yüklendi.`, "success");
          sounds.playSuccess();
        }
      }
    } catch (e) {
      addLog(`İçe aktarma hatası: ${e}`, "error");
    }
  }, [installing, installers, installedApps, addLog]);

  const proceedUninstall = useCallback(async (app, setShowLogs) => {
    setInstalling(true);
    setIsUninstalling(true);
    if (setShowLogs) setShowLogs(true);
    addLog(`${app.name} kaldırılıyor...`, "process");

    try {
      const appPath = app.path;
      setInstallStatus(prev => ({ ...prev, [appPath]: "installing" }));

      if (app.uninstall_script) {
        await invoke("run_ps_script", { script: app.uninstall_script });
        addLog(`Başarılı: ${app.name} (Store/Script) kaldırıldı.`, "success");
      } else if (app.portable || app.uninstall_paths) {
        await invoke("uninstall_portable", {
          url: app.download_url,
          appName: app.name,
          uninstallPaths: app.uninstall_paths || null
        });
        addLog(`Başarılı: ${app.name} dosyaları temizlendi.`, "success");
      } else if (app.uninstall_path) {
        await invoke("uninstall_software", { path: app.uninstall_path });
        addLog(`Başarılı: ${app.name} sistemden kaldırıldı.`, "success");
      } else throw new Error("Kaldırma yolu tanımlanmamış.");

      setInstalledApps(prev => {
        const next = { ...prev };
        delete next[app.id];
        return next;
      });

      setInstallStatus(prev => {
        const next = { ...prev };
        delete next[app.path];
        return next;
      });

      setAppProgress(prev => {
        const next = { ...prev };
        delete next[app.path];
        return next;
      });
      
      setTimeout(() => {
        refreshInstalledStatus();
      }, 2000);

      sounds.playSuccess();
    } catch (error) {
      addLog(`Hata: ${error}`, "error");
      sounds.playError();
    }
    setInstalling(false);
    setIsUninstalling(false);
  }, [addLog, refreshInstalledStatus]);

  const startInstall = useCallback(async (setShowLogs) => {
    if (selected.size === 0 || installing) return;
    setInstalling(true);
    if (setShowLogs) setShowLogs(true);
    addLog("Kurulum oturumu başladı.", "info");
    sounds.playClick();
    const selectedApps = installers.filter((i) => selected.has(i.path));
    setInstallProgress({ done: 0, total: selectedApps.length });
    for (let idx = 0; idx < selectedApps.length; idx++) {
      const app = selectedApps[idx];
      setCurrentInstall(app.name);
      setInstallStatus((prev) => ({ ...prev, [app.path]: "installing" }));
      try {
        if (app.script_cmd) {
          const isLogged = app.id === "officetoolplus" || app.is_logged;
          if (isLogged) {
            await invoke("run_shell_script_logged", { script: app.script_cmd, shellType: "powershell" });
          } else {
            await invoke("run_ps_script", { script: app.script_cmd });
          }
          setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
          addLog(`Başlatıldı: ${app.name}`, "success");
        } else if (app.download_url) {
          await invoke("install_exe_from_url", {
            url: app.download_url,
            packageId: app.id,
            appName: app.name,
            isPortable: !!app.portable,
            installArgs: app.install_args,
            shortcutPath: app.shortcut_path,
            postInstallCmd: app.post_install_cmd
          });
          setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
          addLog(`Başarılı: ${app.name}`, "success");
        }
        refreshInstalledStatus();
      } catch (error) {
        setInstallStatus((prev) => ({ ...prev, [app.path]: "error" }));
        addLog(`Hata (${app.name}): ${error}`, "error");
        sounds.playError();
      }
      setInstallProgress({ done: idx + 1, total: selectedApps.length });
    }
    addLog("Tüm işlemler tamamlandı.", "info");
    sounds.playSuccess();
    setCurrentInstall(null);
    setInstalling(false);
  }, [selected, installing, installers, addLog, refreshInstalledStatus]);

  const selectAll = useCallback(() => { 
    if (installing) return;
    const toSelect = installers
      .filter(a => !(installedApps[a.id] && !a.script_cmd && !a.is_resource))
      .map(a => a.path);
    setSelected(new Set(toSelect)); 
  }, [installing, installers, installedApps]);

  const clearSelection = useCallback(() => { 
    if (!installing) setSelected(new Set()); 
  }, [installing]);

  return {
    installers,
    selected,
    installing,
    isUninstalling,
    currentInstall,
    installStatus,
    installedApps,
    installProgress,
    appProgress,
    logs,
    isSessionActive,
    updatesAvailable,
    toggleSelect,
    refreshInstalledStatus,
    addLog,
    proceedUninstall,
    startInstall,
    selectAll,
    clearSelection,
    loadSelection: (paths) => {
      if (installing) return;
      setSelected(new Set(paths));
    },
    exportSelection,
    importSelection,
    getAllSystemSoftware: async () => {
      try {
        return await safeInvoke("get_all_installed_software", {}, []);
      } catch (e) {
        console.error("Failed to get system software", e);
        return [];
      }
    },
    setLogs,
    setIsSessionActive,
    shellType,
    setShellType,
    ensureTerminalSession: async (type) => {
      try {
        await safeInvoke("ensure_terminal_session", { shellType: type || shellType });
      } catch (e) {
        console.error("Terminal start error", e);
      }
    }
  };
};
