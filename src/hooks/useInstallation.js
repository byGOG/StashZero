import { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { safeInvoke } from "../utils/tauri";
import { listen } from '@tauri-apps/api/event';
import { sounds } from "../utils/audio";
import { LEGENDARY_APPS } from "../data/library";
import { compareVersions } from "../utils/updateChecker";

export const useInstallation = () => {
  const installers = useMemo(
    () => LEGENDARY_APPS.map(a => ({ ...a, path: a.id, dependencies: [] })),
    [LEGENDARY_APPS]
  );
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

  const addLog = useCallback((msg, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, msg, type }].slice(-100));
  }, []);

  const refreshInstalledStatus = useCallback(async () => {
    try {
      const payload = installers.map(a => ({
        id: a.id,
        name: a.name,
        check_path: a.check_path || null,
      }));
      const newInstalledApps = await safeInvoke("batch_check_installations", { apps: payload }, {});
      const installedByPath = new Map();
      const updates = {};

      for (const app of installers) {
        const currentVersion = newInstalledApps[app.id];
        if (currentVersion && !app.script_cmd && !app.is_resource) {
          installedByPath.set(app.path, app.id);
          if (compareVersions(app.version, currentVersion) > 0) {
            updates[app.id] = { current: currentVersion, latest: app.version };
          }
        }
      }

      setInstalledApps(newInstalledApps);
      setUpdatesAvailable(updates);

      setSelected(prev => {
        const next = new Set(prev);
        let changed = false;
        installedByPath.forEach((id, path) => {
          if (next.has(path) && !updates[id]) {
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
          if (!app.is_resource) {
            setInstalledApps(prev => ({ ...prev, [app.id]: app.version || "Kurulu" }));
          }
        } else if (app.download_url) {
          await invoke("install_exe_from_url", {
            url: app.download_url,
            packageId: app.id,
            appName: app.name,
            isPortable: !!app.portable,
            installArgs: app.install_args,
            shortcutPath: app.shortcut_path,
            postInstallCmd: app.post_install_cmd,
            installKillTargets: app.install_kill_targets || null,
            downloadFormPost: app.download_form_post || null,
            installPath: app.install_path || null,
            createDesktopShortcut: !!app.create_desktop_shortcut,
            launchFile: app.launch_file || null
          });
          setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
          addLog(`Başarılı: ${app.name}`, "success");
          if (!app.is_resource) {
            setInstalledApps(prev => ({ ...prev, [app.id]: app.version || "Kurulu" }));
          }
        }
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
    setTimeout(() => refreshInstalledStatus(), 1500);
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

    getAllSystemSoftware: useCallback(async () => {
      try {
        return await safeInvoke("get_all_installed_software", {}, []);
      } catch (e) {
        console.error("Failed to get system software", e);
        return [];
      }
    }, []),
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
