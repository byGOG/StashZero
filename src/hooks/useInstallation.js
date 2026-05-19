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
    // Keep Vite HMR from pinning stale installer metadata during development.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const isRealInstall = currentVersion && !app.is_resource &&
          (!app.script_cmd || !!app.uninstall_script || !!app.uninstall_path);
        if (isRealInstall) {
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
    const isRealInstall = app && installedApps[app.id] && !app.is_resource &&
      (!app.script_cmd || !!app.uninstall_script || !!app.uninstall_path);
    if (isRealInstall) {
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
        addLog(`✓ ${app.name} kaldırıldı (özel kaldırma betiği çalıştırıldı).`, "success");
      } else if (app.portable || app.uninstall_paths) {
        await invoke("uninstall_portable", {
          url: app.download_url,
          appName: app.name,
          uninstallPaths: app.uninstall_paths || null
        });
        const where = app.uninstall_paths
          ? `${app.uninstall_paths.length} özel yol`
          : `C:\\StashZero\\${app.name}`;
        addLog(`✓ ${app.name} kaldırıldı (silinen: ${where}).`, "success");
      } else if (app.uninstall_path) {
        await invoke("uninstall_software", {
          path: app.uninstall_path,
          uninstallArgs: app.uninstall_args || null,
          uninstallKillTargets: app.uninstall_kill_targets || null,
          uninstallAsAdmin: app.uninstall_as_admin ?? null
        });
        addLog(`✓ ${app.name} kaldırıldı (kaldırıcı çalıştırıldı: ${app.uninstall_path}).`, "success");
      } else throw new Error("Kaldırma yolu tanımlanmamış.");

      const shortcutNames = new Set();
      if (app.create_desktop_shortcut || app.create_start_menu_shortcut) {
        shortcutNames.add(app.name);
      }
      if (Array.isArray(app.uninstall_shortcut_names)) {
        app.uninstall_shortcut_names.forEach(n => shortcutNames.add(n));
      }
      if (shortcutNames.size > 0) {
        for (const name of shortcutNames) {
          try { await invoke("delete_shortcuts", { appName: name }); } catch {
            /* ignore deletion errors */
          }
        }
      }

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
            await invoke("run_ps_script", {
              script: app.script_cmd,
              visible: !!app.script_visible,
              asAdmin: app.script_as_admin ?? null,
              keepOpen: !!app.script_keep_open
            });
          }
          setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
          addLog(`✓ Betik tamamlandı: ${app.name} (PowerShell başarıyla çalıştı).`, "success");
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
            preInstallCmd: app.pre_install_cmd,
            installKillTargets: app.install_kill_targets || null,
            downloadFormPost: app.download_form_post || null,
            installPath: app.install_path || null,
            createDesktopShortcut: !!app.create_desktop_shortcut,
            launchFile: app.launch_file || null,
            launchPath: app.launch_path || null,
            createStartMenuShortcut: !!app.create_start_menu_shortcut,
            archivePassword: app.archive_password || null,
            checkPath: app.check_path || null,
            installAsAdmin: app.install_as_admin ?? null
          });
          setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
          const versionTag = app.version && app.version !== "Güncel" ? ` v${app.version}` : "";
          addLog(`✓ ${app.name}${versionTag} kuruldu ve "Kurulu" olarak işaretlendi.`, "success");
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
      .filter(a => {
        const isRealInstall = installedApps[a.id] && !a.is_resource &&
          (!a.script_cmd || !!a.uninstall_script || !!a.uninstall_path);
        return !isRealInstall;
      })
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
