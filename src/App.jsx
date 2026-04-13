import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';
import { open, save } from "@tauri-apps/plugin-dialog";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { sounds } from "./utils/audio";
import "./App.css";
import { LEGENDARY_APPS, POPULAR_DNS, APP_ICON_MAP, SPECIAL_LOGOS } from "./data/library";

const SidebarIcon = ({ type }) => {
  const props = { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  
  switch (type) {
    case "globe": return (
      <svg {...props}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
    case "terminal":
    case "code": return (
      <svg {...props}>
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    );
    case "message":
    case "message-square":
    case "message-circle": return (
      <svg {...props}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
    case "monitor":
    case "tv": return (
      <svg {...props}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
    case "file-text": return (
      <svg {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
    case "settings": return (
      <svg {...props}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
    case "gaming":
    case "play-circle": return (
      <svg {...props}>
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
      </svg>
    );
    case "security":
    case "shield":
    case "shield-check": return (
      <svg {...props}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
    case "script": return (
      <svg {...props}>
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
        <path d="m8 13 2 2-2 2" />
        <path d="M12 17h3" />
      </svg>
    );
    case "music": return (
      <svg {...props}>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );
    case "video": return (
      <svg {...props}>
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    );
    case "mail": return (
      <svg {...props}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    );
    case "zap": return (
      <svg {...props}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
    case "cpu": return (
      <svg {...props}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M15 2v2M9 2v2M20 15h2M20 9h2M15 20v2M9 20v2M2 15h2M2 9h2" />
      </svg>
    );
    default: return (
      <svg {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      </svg>
    );
  }
};

const TelemetryIcon = ({ type }) => {
  switch (type) {
    case "cpu": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M9 9h6v6H9z" fill="currentColor" fillOpacity="0.2" />
        <path d="M15 2v2M9 2v2M20 15h2M20 9h2M15 20v2M9 20v2M2 15h2M2 9h2" />
      </svg>
    );
    case "ram": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 19v-3M10 19v-3M14 19v-3M18 19v-3M2 6v12h20V6H2z" />
        <path d="M21 10h-2M21 14h-2" />
      </svg>
    );
    case "disk": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M12 18h.01" strokeWidth="3" />
        <circle cx="12" cy="8" r="3" strokeOpacity="0.4" />
      </svg>
    );
    case "net": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14l-4 4-4-4M19 12l-4-4-4 4" />
        <path d="M12 2v20" strokeOpacity="0.2" />
      </svg>
    );
    default: return null;
  }
};

const formatSpeed = (kbps) => {
  if (kbps >= 1024 * 1024) return `${(kbps / (1024 * 1024)).toFixed(1)} GB/s`;
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`;
  return `${kbps.toFixed(1)} KB/s`;
};

const ProjectLogo = ({ size = 80, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={`project-logo-svg ${className}`}>
    <defs>
      <linearGradient id="logo-grad-unified" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00ff9f" />
        <stop offset="100%" stopColor="#00c9ff" />
      </linearGradient>
      <filter id="glow-unified">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <circle cx="50" cy="50" r="45" fill="none" stroke="url(#logo-grad-unified)" strokeWidth="1.5" opacity="0.3" strokeDasharray="10 5" />
    <path d="M50 15 A35 35 0 0 1 85 50 A35 35 0 0 1 50 85 A35 35 0 0 1 15 50 A35 35 0 0 1 50 15" fill="none" stroke="url(#logo-grad-unified)" strokeWidth="3" filter="url(#glow-unified)" />
    <path d="M30 50 C30 30, 45 30, 50 50 S70 70, 70 50" fill="none" stroke="url(#logo-grad-unified)" strokeWidth="10" strokeLinecap="round" filter="url(#glow-unified)" />
    <path d="M30 50 C30 30, 45 30, 50 50 S70 70, 70 50" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const AppLogo = ({ id, className, ...props }) => {
  if (SPECIAL_LOGOS[id]) {
    return (
      <div className={`${className} logo-container`} {...props}>
        <img src={SPECIAL_LOGOS[id]} alt={id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    );
  }

  const slug = APP_ICON_MAP[id] || "windowsterminal";
  const iconUrl = `https://cdn.simpleicons.org/${slug}`;

  return (
    <div className={`${className} logo-container`} {...props}>
      <img
        src={iconUrl}
        alt={id}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = '<div class="fallback-logo-wrap"><svg width="24" height="24" viewBox="0 0 100 100"><path d="M30 50 C30 30, 45 30, 50 50 S70 70, 70 50" fill="none" stroke="#00ff9f" stroke-width="12" stroke-linecap="round" /></svg></div>';
        }}
      />
    </div>
  );
};

function App() {
  const [installers, setInstallers] = useState(LEGENDARY_APPS.map(a => ({ ...a, path: a.id, dependencies: [] })));
  const [selected, setSelected] = useState(new Set());
  const [installing, setInstalling] = useState(false);
  const [currentInstall, setCurrentInstall] = useState(null);
  const [installStatus, setInstallStatus] = useState({});
  const [installedApps, setInstalledApps] = useState({}); // id -> version
  const [installProgress, setInstallProgress] = useState({ done: 0, total: 0 });
  const [appProgress, setAppProgress] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTheme, setCurrentTheme] = useState("obsidian");
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [menuHover, setMenuHover] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [diskUsage, setDiskUsage] = useState(null);

  const [activeCategory, setActiveCategory] = useState(() => {
    return localStorage.getItem("stash-zero-active-category") || null;
  });
  const [customArgs, setCustomArgs] = useState({});
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showControlCenter, setShowControlCenter] = useState(true);
  const [dnsOpen, setDnsOpen] = useState(false);
  const [logPanelHeight, setLogPanelHeight] = useState(220);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const menuBarRef = useRef(null);
  const searchInputRef = useRef(null);
  const logEndRef = useRef(null);
  const isResizingLog = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(220);

  // Sync installers if LEGENDARY_APPS changes (Dev/HMR)
  useEffect(() => {
    setInstallers(LEGENDARY_APPS.map(a => ({ ...a, path: a.id, dependencies: [] })));
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, showLogs]);

  // Log panel resize handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingLog.current) return;
      e.preventDefault();
      const delta = startY.current - e.clientY;
      const newHeight = Math.min(600, Math.max(100, startHeight.current + delta));
      setLogPanelHeight(newHeight);
    };
    const handleMouseUp = () => {
      if (isResizingLog.current) {
        isResizingLog.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startLogResize = useCallback((e) => {
    isResizingLog.current = true;
    startY.current = e.clientY;
    startHeight.current = logPanelHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [logPanelHeight]);

  // Load persistence and keyboard shortcuts
  useEffect(() => {
    const savedTheme = localStorage.getItem("stash-zero-theme");
    if (savedTheme) setCurrentTheme(savedTheme);

    const savedCleanup = localStorage.getItem("stash-zero-cleanup");
    if (savedCleanup) setAutoCleanup(JSON.parse(savedCleanup));

    const savedSound = localStorage.getItem("stash-zero-sound");
    if (savedSound) setSoundEnabled(JSON.parse(savedSound));

    const savedCategory = localStorage.getItem("stash-zero-active-category");
    if (savedCategory) setActiveCategory(savedCategory);

    // Handle Splashscreen: Initial load + 3.5s buffer for professional feel
    const timer = setTimeout(() => {
      invoke("close_splashscreen").catch(e => console.error("Splash error:", e));
    }, 3500);

    const handleKeyDown = (e) => {
      // Search: Ctrl+F
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Select All: Ctrl+A
      if (e.ctrlKey && (e.key === "a" || e.key === "A")) {
        // Only if not in search input
        if (document.activeElement !== searchInputRef.current) {
          e.preventDefault();
          selectAll();
        }
      }
      // Install: F6
      if (e.key === "F6") {
        e.preventDefault();
        startInstall();
      }
      // Escape: Clear search / Close menu / Close modal
      if (e.key === "Escape") {
        setSearchTerm("");
        setOpenMenu(null);
        setShowSettings(false);
        setShowAbout(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [installers]);

  // Initial load
  useEffect(() => {
    const installersCount = installers.length;
    addLog(`${installersCount} adet efsane uygulama hazır.`, "info");

    // Set initial category
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].name);
    }

    refreshInstalledStatus();
  }, []);

  // Listen for install progress events
  useEffect(() => {
    const unlisten = listen('install-progress', (event) => {
      const payload = event.payload;
      const { package_id, percentage, message } = payload;
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

    return () => {
      unlisten.then(f => f());
      unlistenScript.then(f => f());
    };
  }, []);

  const sendTerminalCommand = async () => {
    if (!terminalInput.trim()) return;
    try {
      addLog(`> ${terminalInput}`, "command");
      const cmd = terminalInput;
      setTerminalInput("");
      await invoke("send_script_input", { input: cmd });
    } catch (err) {
      addLog(`Girdi hatası: ${err}`, "error");
    }
  };

  const killActiveSession = async () => {
    try {
      await invoke("kill_script");
      setIsSessionActive(false);
      addLog("Oturum kullanıcı tarafından sonlandırıldı.", "info");
    } catch (err) {
      addLog(`Durdurma hatası: ${err}`, "error");
    }
  };

  // System Info Polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const info = await invoke("get_system_info");
        setSystemInfo(info);
      } catch (e) {
        console.error("System info error", e);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Group installers by category
  const categories = useMemo(() => {
    const map = new Map();
    for (const app of installers) {
      const cat = app.category;
      if (!map.has(cat)) {
        map.set(cat, { name: cat, order: app.category_order, count: 0, icon: app.icon });
      }
      map.get(cat).count++;
    }
    const list = Array.from(map.values()).sort((a, b) => a.order - b.order);

    // Auto-set first category if none active or current one disappeared
    if (list.length > 0) {
      const exists = list.some(c => c.name === activeCategory);
      if (!activeCategory || !exists) {
        setActiveCategory(list[0].name);
        localStorage.setItem("stash-zero-active-category", list[0].name);
      }
    }
    return list;
  }, [installers, activeCategory]);

  const filteredApps = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return installers.filter(app => {
      const matchesSearch = !term || app.name.toLowerCase().includes(term);
      const matchesCategory = !activeCategory || app.category === activeCategory;
      return matchesSearch && (term ? matchesSearch : matchesCategory);
    });
  }, [installers, searchTerm, activeCategory]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  const toggleSelect = async (path) => {
    if (installing) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
    sounds.playClick();
  };

  const refreshInstalledStatus = async () => {
    try {
      const systemApps = await invoke("get_installed_winget_ids"); // Array of [name, version]
      const newInstalledApps = {};

      for (const app of installers) {
        const lowerName = app.name.toLowerCase();
        const lowerId = app.id.toLowerCase();

        let match = systemApps.find(([name, _]) => {
          const lowerN = name.toLowerCase();
          return lowerN === lowerName || lowerN === lowerId || lowerN.includes(lowerName);
        });

        if (match) {
          newInstalledApps[app.id] = match[1] || "Kurulu";
        }
      }

      setInstalledApps(newInstalledApps);
    } catch (e) {
      console.error("Installation status check failed", e);
    }
  };

  const addLog = (msg, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, msg, type }, ...prev].slice(0, 100));
  };

  const startUninstall = async (app) => {
    setInstalling(true);
    setShowLogs(true);
    addLog(`${app.name} kaldırılıyor...`, "process");

    try {
      if (app.portable) {
        await invoke("uninstall_portable", { url: app.download_url, appName: app.name });
        addLog(`Başarılı: ${app.name} silindi.`, "success");
      } else if (app.uninstall_path) {
        addLog(`> ${app.uninstall_path}`, "command");
        await invoke("uninstall_software", { path: app.uninstall_path });
        addLog(`Başarılı: ${app.name} sistemden kaldırıldı.`, "success");
      } else {
        throw new Error("Kaldırma yolu tanımlanmamış.");
      }
      refreshInstalledStatus();
      sounds.playSuccess();
    } catch (error) {
      addLog(`Hata: ${error}`, "error");
      sounds.playError();
    }
    setInstalling(false);
  };


  const startInstall = async () => {
    if (selected.size === 0 || installing) return;

    setInstalling(true);
    setShowLogs(true);
    addLog("Kurulum oturumu başladı.", "info");
    sounds.playClick();

    const selectedApps = installers.filter((i) => selected.has(i.path));
    setInstallProgress({ done: 0, total: selectedApps.length });

    for (let idx = 0; idx < selectedApps.length; idx++) {
      const app = selectedApps[idx];
      setCurrentInstall(app.name);
      setInstallStatus((prev) => ({ ...prev, [app.path]: "installing" }));
      addLog(`İşlem başlatılıyor: ${app.name}`, "process");

      try {
        if (app.script_cmd) {
          addLog(`> Betik çalıştırılıyor: ${app.script_cmd}`, "command");
          if (app.id === "officetoolplus") {
            await invoke("run_ps_script_logged", { script: app.script_cmd });
          } else {
            await invoke("run_ps_script", { script: app.script_cmd });
          }
          setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
          addLog(`Başlatıldı: ${app.name}`, "success");
        } else if (app.download_url) {
          addLog(`> curl ile indiriliyor: ${app.download_url}`, "command");
          await invoke("install_exe_from_url", {
            url: app.download_url,
            packageId: app.id,
            appName: app.name,
            isPortable: !!app.portable
          });
          setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
          addLog(`Başarılı: ${app.name}`, "success");
        }
        refreshInstalledStatus();
      } catch (error) {
        console.error(`Kurulum hatası (${app.name}):`, error);
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
  };

  const selectAll = () => {
    if (installing) return;
    setSelected(new Set(installers.map((a) => a.path)));
  };

  const clearSelection = () => {
    if (installing) return;
    setSelected(new Set());
  };

  const handleMenuAction = async (action, data = null) => {
    setOpenMenu(null);
    sounds.playClick();
    switch (action) {
      case "export-bundle":
        if (selected.size === 0) return alert("Önce uygulama seçmelisiniz.");
        try {
          const exportPath = await save({
            title: "Paketi Kaydet",
            defaultPath: "bundle.stash",
            filters: [{ name: "Stash Bundle", extensions: ["stash"] }]
          });
          if (exportPath) {
            const bundle = {
              apps: Array.from(selected),
              customArgs
            };
            await writeTextFile(exportPath, JSON.stringify(bundle));
            addLog("Paket dışa aktarıldı.", "success");
          }
        } catch (e) { addLog(`Dışa aktarma hatası: ${e}`, "error"); }
        break;
      case "import-bundle":
        try {
          const importPath = await open({
            multiple: false,
            filters: [{ name: "Stash Bundle", extensions: ["stash"] }]
          });
          if (importPath) {
            const content = await readTextFile(importPath);
            const bundle = JSON.parse(content);
            setSelected(new Set(bundle.apps));
            if (bundle.customArgs) setCustomArgs(bundle.customArgs);
            addLog("Paket içe aktarıldı.", "success");
          }
        } catch (e) { addLog(`İçe aktarma hatası: ${e}`, "error"); }
        break;
      case "select-all":
        selectAll();
        break;
      case "clear-selection":
        clearSelection();
        break;
      case "start-install":
        startInstall();
        break;
      case "toggle-logs":
        setShowLogs(!showLogs);
        break;
      case "clear-logs":
        setLogs([]);
        break;
      case "show-settings":
        setShowSettings(true);
        break;
      case "change-theme":
        setCurrentTheme(data);
        localStorage.setItem("stash-zero-theme", data);
        break;
      case "exit":
        window.close();
        break;
      case "about":
        setShowAbout(true);
        break;
      default:
        break;
    }
  };

  const progressPercent =
    installProgress.total > 0
      ? Math.round((installProgress.done / installProgress.total) * 100)
      : 0;

  const iframeRef = useRef(null);

  const [currentTrackArt, setCurrentTrackArt] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState('KEINEMUSIK');

  useEffect(() => {
    // Load SoundCloud Widget API
    const script = document.createElement('script');
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    script.onload = () => {
      if (iframeRef.current) {
        const widget = window.SC.Widget(iframeRef.current);
        
        const updateTrackInfo = () => {
          widget.getCurrentSound((sound) => {
            if (sound) {
              const art = sound.artwork_url || sound.user.avatar_url;
              setCurrentTrackArt(art);
              setCurrentTrackTitle(sound.title);
            }
          });
        };

        widget.bind(window.SC.Widget.Events.READY, updateTrackInfo);
        widget.bind(window.SC.Widget.Events.PLAY, () => {
          setIsMusicPlaying(true);
          updateTrackInfo();
        });
        widget.bind(window.SC.Widget.Events.PAUSE, () => setIsMusicPlaying(false));
        widget.bind(window.SC.Widget.Events.FINISH, () => setIsMusicPlaying(false));
      }
    };
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  const handleIslandClick = () => {
    setShowMusicPlayer(!showMusicPlayer);
  };

  return (
    <div className={`app-layout theme-${currentTheme}`}>
      <div className="mesh-gradient" />
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-wrapper">
            <ProjectLogo className="project-logo-svg" />
            <div className="logo-glow" />
          </div>
          <h1>StashZero</h1>
        </div>

        <div className="sidebar-nav">
          {categories.map(cat => (
            <div
              key={cat.name}
              className={`sidebar-item ${activeCategory === cat.name ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(cat.name);
                localStorage.setItem("stash-zero-active-category", cat.name);
                sounds.playClick();
              }}
            >
              <div className="sidebar-item-left">
                <SidebarIcon type={cat.icon} />
                <span title={cat.name}>{cat.name}</span>
              </div>
              <span className="sidebar-count">{cat.count}</span>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div
            className="sidebar-item"
            onClick={() => handleMenuAction("show-settings")}
          >
            <span>Ayarlar</span>
          </div>
          <div
            className="sidebar-item"
            onClick={() => handleMenuAction("toggle-logs")}
          >
            <span>Loglar</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="top-left">
            {/* Left side reserved or for branding */}
          </div>

          <div className="search-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Uygulama ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {!searchTerm && <div className="search-shortcut">CTRL + F</div>}
          </div>

          <div className={`music-island ${showMusicPlayer ? 'active' : ''}`}>
             <div className="island-pill" onClick={handleIslandClick}>
                <div className="island-icon-container">
                   {currentTrackArt ? (
                      <div className="art-wrapper">
                         <img src={currentTrackArt.replace('large', 't500x500')} alt="Art" className="island-track-art" />
                         {isMusicPlaying && (
                            <div className="audio-visualizer-mini">
                               <div className="bar"></div>
                               <div className="bar"></div>
                               <div className="bar"></div>
                            </div>
                         )}
                      </div>
                   ) : (
                      <div className={`audio-visualizer ${isMusicPlaying ? 'playing' : ''}`}>
                         <div className="bar"></div>
                         <div className="bar"></div>
                         <div className="bar"></div>
                         <div className="bar"></div>
                      </div>
                   )}
                </div>
                <span className="island-text">{isMusicPlaying ? currentTrackTitle : 'KEINEMUSIK'}</span>
             </div>
          </div>

          <div className="top-right">
            {/* Telemetry is now persistent */}
          </div>
        </header>

        <div className="content-scroll">


          {filteredApps.length === 0 ? (
            <div className="empty-state">
              Görüntülenecek uygulama bulunamadı.
            </div>
          ) : (
            <div className="category-apps">
              {filteredApps.map((app) => {
                const isSelected = selected.has(app.path);
                const status = installStatus[app.path];
                let cardClass = "app-card";
                if (isSelected) cardClass += " selected";
                if (status === "installing") cardClass += " installing";
                if (status === "done" && !app.script_cmd) cardClass += " done";
                if (status === "error") cardClass += " error";
                if (installedApps[app.id] && !app.script_cmd) cardClass += " installed";
                if (app.is_resource) cardClass += " resource-vibe";

                return (
                  <div
                    key={app.path}
                    className={cardClass}
                    onClick={() => {
                      if (app.is_resource && app.official_url) {
                        openUrl(app.official_url);
                      } else {
                        toggleSelect(app.path);
                      }
                    }}
                    onMouseMove={handleMouseMove}
                  >
                    <div className="app-icon">
                      <AppLogo id={app.id} className="brand-logo" />
                      {(installedApps[app.id] && !app.script_cmd) && (
                        <div className="installed-badge">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      )}
                    </div>
                    <div className="app-info">
                      <div className="app-name-row">
                        <span className="app-name" title={app.name}>{app.name}</span>
                      </div>

                      <div className="badges-row">
                        {app.portable && <span className="app-badge badge-portable">Taşınabilir</span>}
                        {(!app.is_resource && installedApps[app.id]) && <span className="app-badge badge-installed">Kurulu</span>}
                        <span className="app-badge badge-version">
                          {installedApps[app.id] && installedApps[app.id] !== "Portable" && installedApps[app.id] !== "Kurulu"
                            ? installedApps[app.id]
                            : app.version}
                        </span>
                        {!app.is_resource && !app.script_cmd && app.size_bytes && <span className="app-badge badge-size">{(app.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>}
                      </div>

                      <div className="app-description">
                        {app.description}
                      </div>

                      <div className="app-actions-top">
                        {app.official_url && (
                          <button className="icon-action-btn" onClick={(e) => { e.stopPropagation(); openUrl(app.official_url); }} title="Web Sitesi">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                          </button>
                        )}
                        {(installedApps[app.id] && !app.script_cmd) && (
                          <button className="icon-action-btn delete-vibe" onClick={(e) => { e.stopPropagation(); startUninstall(app); }} title="Kaldır">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        )}
                        {((installedApps[app.id] && app.portable && !app.script_cmd) || app.script_cmd) && (
                          <button
                            className={`primary-launch-btn ${app.script_cmd ? 'script-vibe' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (app.script_cmd) {
                                const cmd = app.id === "officetoolplus" ? "run_ps_script_logged" : "run_ps_script";
                                invoke(cmd, { script: app.script_cmd }).then(() => addLog(`${app.name} çalıştırılıyor...`, "success")).catch(err => addLog(`Hata: ${err}`, "error"));
                                setShowLogs(true);
                              } else {
                                invoke("launch_portable", { url: app.download_url, appName: app.name, launchFile: app.launch_file }).then(() => addLog(`${app.name} başlatılıyor...`, "success")).catch(err => addLog(`Hata: ${err}`, "error"));
                              }
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          </button>
                        )}
                      </div>
                    </div>
                    {status === "installing" && (
                      appProgress[app.path] !== undefined ? (
                        <div className="app-progress">
                          <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${appProgress[app.path]}%` }} />
                          </div>
                          <span className="progress-percent">{appProgress[app.path]}%</span>
                        </div>
                      ) : (
                        <div className="spinner" />
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {installers.length > 0 && !installing && (
          <div className="action-bar">
            <div className="selection-info">
              <strong>{selected.size}</strong> uygulama seçildi
            </div>
            <div className="action-btns">
              <button className="neon-button" onClick={clearSelection} disabled={selected.size === 0 || installing}>Seçimi Temizle</button>
              <button className="neon-button primary" onClick={startInstall} disabled={selected.size === 0 || installing}>
                {installing ? "Kuruluyor..." : "Sessiz Kurulum Başlat"}
              </button>
            </div>
          </div>
        )}
        {/* ─── Global Progress (Modern Bottom Bar) ─── */}
        {installing && (
          <div className="global-progress">
            <div className="progress-header">
              Kuruluyor: <strong>{currentInstall}</strong>
            </div>
            <div className="progress-container">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="progress-percent-label">{installProgress.done}/{installProgress.total} • {progressPercent}%</div>
            </div>
          </div>
        )}

        {/* ─── Integrated Terminal (Docked at Bottom) ─── */}
        {showLogs && (
          <div className="log-panel" style={{ height: logPanelHeight }}>
            <div className="log-resize-handle" onMouseDown={startLogResize} />
            <div className="log-header">
              <span>Yükleme Günlüğü</span>
              <div className="log-actions">
                {isSessionActive && (
                  <>
                    <div className="session-badge">AKTİF OTURUM</div>
                    <button className="kill-session-btn" onClick={killActiveSession}>DURDUR</button>
                  </>
                )}
                <button className="icon-btn-sm" onClick={() => setLogs([])} title="Kayıtları Temizle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
                <button className="icon-btn-sm close-btn" onClick={() => setShowLogs(false)} title="Günlüğü Kapat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
            <div className="log-panel-inner" style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
              <div className="log-content">
                {logs.length === 0 ? (
                  <div className="log-empty">Henüz bir kayıt yok.</div>
                ) : (
                  logs.slice().reverse().map((log, i) => (
                    <div key={i} className={`log-entry ${log.type}`}>
                      <span className="log-time">[{log.time}]</span>
                      <span className="log-msg">{log.msg}</span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>

              {isSessionActive && (
                <div className="terminal-input-row" onClick={() => document.getElementById('term-input')?.focus()}>
                  <span className="terminal-prompt">PS &gt;</span>
                  <input
                    id="term-input"
                    type="text"
                    className="terminal-input"
                    placeholder="Komut yazın ve Enter'a basın..."
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendTerminalCommand();
                    }}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── Control Center (Right Sidebar) ─── */}
      {showControlCenter && (
        <aside className="control-center">
          <div className="cc-header">
            <h2>Sistem Telemetrisi</h2>
          </div>

          <div className="cc-content">
            {/* App Selection / Details Area */}
            <div className="cc-section">
              <h3 className="cc-section-title">Aktif Dosya Durumu</h3>
              <div className="file-status-list">
                <div className="file-status-item">
                  <span className="file-status-label">Seçilen</span>
                  <span className="file-status-value">{selected.size} Uygulama</span>
                </div>
                <div className="file-status-item">
                  <span className="file-status-label">Toplam Boyut</span>
                  <span className="file-status-value">{installers.filter(i => selected.has(i.path)).reduce((acc, curr) => acc + curr.size_bytes, 0) > 0
                    ? (installers.filter(i => selected.has(i.path)).reduce((acc, curr) => acc + curr.size_bytes, 0) / (1024 * 1024)).toFixed(1) + " MB"
                    : "0 MB"}</span>
                </div>
              </div>
            </div>

            {/* Performance Telemetry */}
            {systemInfo && (
              <div className="cc-section">
                <h3 className="cc-section-title">Performans</h3>
                <div className="telemetry-grid">
                  <div className="telemetry-card">
                    <div className="tel-header">
                      <div className="tel-label-group">
                        <TelemetryIcon type="cpu" />
                        <span className="tel-label">İşlemci (CPU)</span>
                      </div>
                      <span className="tel-value">{Math.round(systemInfo.cpu_usage)}%</span>
                    </div>
                    <div className="tel-progress">
                      <div className="tel-fill" style={{ width: `${systemInfo.cpu_usage}%` }} />
                    </div>
                  </div>
                  <div className="telemetry-card">
                    <div className="tel-header">
                      <div className="tel-label-group">
                        <TelemetryIcon type="ram" />
                        <span className="tel-label">Bellek (RAM)</span>
                      </div>
                      <span className="tel-value">{Math.round((systemInfo.used_memory / systemInfo.total_memory) * 100)}%</span>
                    </div>
                    <div className="tel-progress">
                      <div className="tel-fill" style={{ width: `${(systemInfo.used_memory / systemInfo.total_memory) * 100}%` }} />
                    </div>
                  </div>
                  {systemInfo.disks && systemInfo.disks.map((disk, idx) => {
                    const used = disk.total_space - disk.available_space;
                    const pct = Math.round((used / disk.total_space) * 100);
                    return (
                      <div
                        className="telemetry-card clickable"
                        key={idx}
                        onClick={() => {
                          invoke("open_drive", { path: disk.mount_point });
                          sounds.playClick();
                        }}
                        title={`${disk.mount_point} Klasörünü Aç`}
                      >
                        <div className="tel-header">
                          <div className="tel-label-group">
                            <TelemetryIcon type="disk" />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="tel-label">{disk.name || disk.mount_point}</span>
                              <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{disk.model} ({disk.bus_type})</span>
                            </div>
                          </div>
                          <span className="tel-value">{pct}%</span>
                        </div>
                        <div className="tel-progress">
                          <div className="tel-fill" style={{ width: `${pct}%`, background: pct > 90 ? '#ff4757' : 'var(--accent-primary)' }} />
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                          {Math.round(used / (1024 * 1024 * 1024))} GB / {Math.round(disk.total_space / (1024 * 1024 * 1024))} GB
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Network */}
            {systemInfo && (
              <div className="cc-section">
                <h3 className="cc-section-title">Ağ Trafiği</h3>
                <div className="net-monitor">
                  <div className="net-stat download">
                    <div className="net-stat-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      <span>İndirme</span>
                    </div>
                    <span>{formatSpeed(systemInfo.net_in)}</span>
                    <div className="net-activity"><div className="net-activity-bar" style={{ width: `${Math.min(100, systemInfo.net_in / 10)}%` }}></div></div>
                  </div>
                  <div className="net-stat upload">
                    <div className="net-stat-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      <span>Yükleme</span>
                    </div>
                    <span>{formatSpeed(systemInfo.net_out)}</span>
                    <div className="net-activity"><div className="net-activity-bar" style={{ width: `${Math.min(100, systemInfo.net_out / 10)}%` }}></div></div>
                  </div>
                </div>
              </div>
            )}

            {/* System Details */}
            {systemInfo && (
              <div className="cc-section">
                <h3 className="cc-section-title">Sistem Özellikleri</h3>
                <div className="specs-list">
                  <div className="spec-item os-section">
                    <div className="os-header">
                      <span className="spec-key">İşletim Sistemi</span>
                      <div className="os-statuses">
                        <span className={`status-badge ${systemInfo.uefi_boot ? 'on' : 'off'}`} title="Modern sistem önyükleme standardı.">UEFI Boot</span>
                        <span className={`status-badge ${systemInfo.secure_boot ? 'on' : 'off'}`} title="Güvenli önyükleme; sadece dijital imzalı yazılımların başlamasına izin verir.">Secure Boot</span>
                      </div>
                    </div>
                    <span className="spec-val large" title={systemInfo.os_version}>{systemInfo.os_version}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">İşlemci Modeli</span>
                    <span className="spec-val" title={systemInfo.cpu_model}>{systemInfo.cpu_model}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">Grafik Kartı (GPU)</span>
                    <span className="spec-val" title={systemInfo.gpu_model}>{systemInfo.gpu_model}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">Anakart</span>
                    <span className="spec-val" title={systemInfo.motherboard}>{systemInfo.motherboard}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">BIOS</span>
                    <span className="spec-val" title={systemInfo.bios_info}>{systemInfo.bios_info}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">Toplam Bellek</span>
                    <span className="spec-val">{Math.round(systemInfo.total_memory / (1024 * 1024 * 1024))} GB</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">Yerel IP</span>
                    <span className="spec-val">{systemInfo.local_ip}</span>
                  </div>
                  <div className="spec-item" style={{ position: 'relative' }}>
                    <span className="spec-key">DNS Sunucuları</span>
                    <span
                      className="spec-val"
                      style={{ fontSize: '10px', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      title={systemInfo.dns_servers}
                      onClick={(e) => { e.stopPropagation(); setDnsOpen(!dnsOpen); }}
                    >
                      {(() => {
                        const activeDns = POPULAR_DNS.find(d => systemInfo.dns_servers.includes(d.ips[0]));
                        return activeDns && (
                          <img
                            src={SPECIAL_LOGOS[activeDns.slug] || `https://cdn.simpleicons.org/${activeDns.slug}`}
                            alt={activeDns.name}
                            style={{ width: '12px', height: '12px', filter: 'drop-shadow(0 0 5px var(--accent-glow))' }}
                          />
                        );
                      })()}
                      {systemInfo.dns_servers}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.5, transform: dnsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="m6 9 6 6 6-6" /></svg>
                    </span>

                    {dnsOpen && (
                      <div className="dns-quick-list" onClick={(e) => e.stopPropagation()}>
                        <div className="dns-quick-header">
                          <span>DNS Değiştirici</span>
                          <button onClick={() => setDnsOpen(false)}>&times;</button>
                        </div>
                        {POPULAR_DNS.map(dns => (
                          <div
                            key={dns.name}
                            className="dns-quick-item"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                addLog(`${dns.name} DNS uygulanıyor...`, "process");
                                await invoke("set_dns", { dns: dns.ips });
                                addLog(`${dns.name} DNS başarıyla ayarlandı.`, "success");
                                sounds.playSuccess();
                                // Immediate UI update
                                setSystemInfo(prev => prev ? { ...prev, dns_servers: dns.ips.join(", ") } : prev);
                                setDnsOpen(false);
                              } catch (err) {
                                addLog(`DNS Hatası: ${err}`, "error");
                                sounds.playError();
                              }
                            }}
                          >
                            <div className="dns-q-header-row">
                              <img src={SPECIAL_LOGOS[dns.slug] || `https://cdn.simpleicons.org/${dns.slug}`} alt={dns.name} className="dns-q-icon" />
                              <span className="dns-q-name">{dns.name}</span>
                            </div>
                            <span className="dns-q-ips">{dns.ips[0]}</span>
                          </div>
                        ))}
                        <div
                          className="dns-quick-item reset"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              addLog("DNS ayarları sıfırlanıyor...", "process");
                              await invoke("reset_dns");
                              addLog("DNS ayarları otomatiğe döndürüldü.", "success");
                              sounds.playSuccess();
                              // Refresh DNS in UI
                              setTimeout(async () => {
                                const info = await invoke("get_system_info");
                                setSystemInfo(info);
                              }, 500);
                              setDnsOpen(false);
                            } catch (err) {
                              addLog(`DNS Hatası: ${err}`, "error");
                            }
                          }}
                        >
                          Otomatik DNS'e Dön
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </aside>
      )}

      {/* ─── Settings Modal ─── */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>StashZero Ayarları</h2>
              <button className="close-btn circle modern-modal-close" onClick={() => setShowSettings(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="modal-body settings-body">
              <div className="setting-card">
                <div className="setting-info">
                  <span className="setting-title">Otomatik Temizlik</span>
                  <span className="setting-desc">Kurulum bittikten sonra inen kalıntı dosyaları otomatik siler.</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={autoCleanup}
                    onChange={(e) => {
                      setAutoCleanup(e.target.checked);
                      localStorage.setItem("stash-zero-cleanup", JSON.stringify(e.target.checked));
                    }}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-card">
                <div className="setting-info">
                  <span className="setting-title">Ses Efektleri</span>
                  <span className="setting-desc">Etkileşimlerde ufak ses bildirimleri çalınsın.</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => {
                      setSoundEnabled(e.target.checked);
                      sounds.setEnabled(e.target.checked);
                      localStorage.setItem("stash-zero-sound", JSON.stringify(e.target.checked));
                    }}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-card col">
                <div className="setting-info">
                  <span className="setting-title">Tema Seçimi</span>
                  <span className="setting-desc">Uygulama arayüzünün estetiğini belirleyin.</span>
                </div>
                <div className="theme-selector modern">
                  <button className={currentTheme === "obsidian" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "obsidian")}>Obsidian</button>
                  <button className={currentTheme === "violet" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "violet")}>Violet</button>
                  <button className={currentTheme === "arctic" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "arctic")}>Arctic</button>
                  <button className={currentTheme === "crimson" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "crimson")}>Crimson</button>
                  <button className={currentTheme === "gold" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "gold")}>Gold</button>
                </div>
              </div>



            </div>
            <div className="modal-footer">
              <button className="neon-button primary custom-save-btn" onClick={() => setShowSettings(false)}>Değişiklikleri Kaydet</button>
            </div>
          </div>
        </div>
      )}
      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal-content about-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>StashZero Hakkında</h2>
              <button className="close-btn" onClick={() => setShowAbout(false)}>&times;</button>
            </div>
            <div className="modal-body about-body">
              <div className="about-branding">
                <ProjectLogo size={60} />
                <div className="about-title">
                  <h3>StashZero</h3>
                </div>
              </div>
              <div className="about-info-grid">
                <div className="info-item">
                  <span className="label">Geliştirici</span>
                  <span className="value">byGOG</span>
                </div>
                <div className="info-item">
                  <span className="label">Sürüm</span>
                  <span className="value">v1.0.0 (Master)</span>
                </div>
                <div className="info-item">
                  <span className="label">Mimari</span>
                  <span className="value">Tauri 2.5 + React 18 (Turbo)</span>
                </div>
                <div className="info-item">
                  <span className="label">Motor</span>
                  <span className="value">Rust (Yüksek Performans)</span>
                </div>
              </div>
              <div className="about-desc">
                StashZero, modern ve hız odaklı bir çevrimdışı uygulama kütüphanesidir.
                Gelişmiş telemetri hub'ı ve tek tıkla kurulum özelliği ile
                profesyonel kullanıcılar için tasarlanmış bir "Ninite" klonudur.
              </div>
              <div className="about-copyright">
                © 2026 byGOG Software. Tüm hakları saklıdır.
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ─── Global Music Player Layer ─── */}
      <div 
        className={`island-backdrop ${showMusicPlayer ? 'visible' : ''}`} 
        onClick={() => setShowMusicPlayer(false)}
      />

      <div className={`island-player-dropdown global-layer ${showMusicPlayer ? 'visible' : 'hidden'}`}>
        <div className="dropdown-header">
           <div className="live-dot" />
           <span>STASH RADIO: KEINEMUSIK</span>
           <button className="island-close-btn" onClick={() => setShowMusicPlayer(false)}>&times;</button>
        </div>
        <iframe 
           ref={iframeRef}
           id="sc-widget-player"
           className="soundcloud-full-player"
           width="100%" 
           height="450" 
           scrolling="no" 
           frameBorder="no" 
           allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
           src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/keinemusik&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=true&show_teaser=true&visual=false&show_artwork=true"
         ></iframe>
      </div>
    </div>
  );
}

export default App;
