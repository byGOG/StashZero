import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { sounds } from "./utils/audio";
import "./App.css";

const SidebarIcon = ({ type }) => {
  switch (type) {
    case "globe": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/>
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
        <circle cx="12" cy="10" r="3" strokeOpacity="0.5"/>
      </svg>
    );
    case "terminal": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2" strokeOpacity="0.2"/>
        <path d="m7 8 5 5-5 5" strokeWidth="2.5"/>
        <path d="M13 17h4" strokeWidth="2.5"/>
      </svg>
    );
    case "message": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        <path d="M8 12h.01" strokeWidth="3" strokeLinecap="round"/>
        <path d="M12 12h.01" strokeWidth="3" strokeLinecap="round"/>
        <path d="M16 12h.01" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    );
    case "monitor": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="15" x="2" y="3" rx="2" strokeOpacity="0.2"/>
        <path d="M12 18v3"/>
        <path d="M8 21h8"/>
        <path d="m9 8 6 3-6 3V8z" fill="currentColor" fillOpacity="0.2"/>
      </svg>
    );
    case "file-text": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <path d="M14 2v6h6" strokeOpacity="0.3"/>
        <path d="M8 13h8M8 17h8M8 9h2" strokeOpacity="0.5"/>
      </svg>
    );
    case "settings": return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3" strokeOpacity="0.4"/>
      </svg>
    );
    default: return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>;
  }
};

const TelemetryIcon = ({ type }) => {
  switch (type) {
    case "cpu": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
        <path d="M9 9h6v6H9z" fill="currentColor" fillOpacity="0.2"/>
        <path d="M15 2v2M9 2v2M20 15h2M20 9h2M15 20v2M9 20v2M2 15h2M2 9h2"/>
      </svg>
    );
    case "ram": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 19v-3M10 19v-3M14 19v-3M18 19v-3M2 6v12h20V6H2z"/>
        <path d="M21 10h-2M21 14h-2"/>
      </svg>
    );
    case "disk": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <path d="M12 18h.01" strokeWidth="3"/>
        <circle cx="12" cy="8" r="3" strokeOpacity="0.4"/>
      </svg>
    );
    case "net": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14l-4 4-4-4M19 12l-4-4-4 4"/>
        <path d="M12 2v20" strokeOpacity="0.2"/>
      </svg>
    );
    default: return null;
  }
};

const APP_ICON_MAP = {
  chrome: "googlechrome",
  firefox: "firefoxbrowser",
  brave: "brave",
  vscode: "visualstudiocode",
  git: "git",
  nodejs: "nodedotjs",
  python: "python",
  discord: "discord",
  telegram: "telegram",
  slack: "slack",
  whatsapp: "whatsapp",
  zoom: "zoom",
  spotify: "spotify",
  vlc: "vlcmediaplayer",
  obs: "obsstudio",
  steam: "steam",
  archive: "7zip",
  winrar: "winrar",
  adobe: "adobeacrobatreader",
  notion: "notion",
  rufus: "rufus"
};

const SPECIAL_LOGOS = {
  vscode: "https://img.icons8.com/color/48/visual-studio-code-2019.png",
  adobe: "https://img.icons8.com/color/48/adobe-acrobat.png",
  rufus: "https://cdn.brandfetch.io/idrMrJarjv/w/512/h/512/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B",
  winrar: "https://img.icons8.com/?size=48&id=PLvn50bVGAlA&format=png&color=000000",
  archive: "https://img.icons8.com/?size=48&id=9ha2laDO6EkM&format=png&color=000000",
  vlc: "https://img.icons8.com/color/48/vlc.png"
};

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
          e.target.src = `https://img.icons8.com/color/48/${id}.png`;
        }}
      />
    </div>
  );
};

const LEGENDARY_APPS = [
  { id: "chrome", name: "Google Chrome", winget_id: "Google.Chrome", category: "Web Tarayıcılar", category_order: 10, icon: "globe", size_bytes: 1024 * 1024 * 95, description: "Dünyanın en popüler web tarayıcısı." },
  { id: "firefox", name: "Mozilla Firefox", winget_id: "Mozilla.Firefox", category: "Web Tarayıcılar", category_order: 10, icon: "globe", size_bytes: 1024 * 1024 * 55, description: "Açık kaynaklı ve gizlilik odaklı tarayıcı." },
  { id: "brave", name: "Brave Browser", winget_id: "Brave.Brave", category: "Web Tarayıcılar", category_order: 10, icon: "globe", size_bytes: 1024 * 1024 * 90, description: "Reklam engelleyici entegreli hızlı tarayıcı." },
  
  { id: "vscode", name: "Visual Studio Code", winget_id: "Microsoft.VisualStudioCode", category: "Geliştirici Araçları", category_order: 20, icon: "terminal", size_bytes: 1024 * 1024 * 85, description: "Güçlü ve esnek kod editörü." },
  { id: "git", name: "Git", winget_id: "Git.Git", category: "Geliştirici Araçları", category_order: 20, icon: "terminal", size_bytes: 1024 * 1024 * 50, description: "Versiyon kontrol sistemi." },
  { id: "nodejs", name: "Node.js LTS", winget_id: "OpenJS.NodeJS.LTS", category: "Geliştirici Araçları", category_order: 20, icon: "terminal", size_bytes: 1024 * 1024 * 30, description: "JavaScript çalışma ortamı." },
  { id: "python", name: "Python 3.12", winget_id: "Python.Python.3.12", category: "Geliştirici Araçları", category_order: 20, icon: "terminal", size_bytes: 1024 * 1024 * 25, description: "Popüler programlama dili." },
  
  { id: "discord", name: "Discord", winget_id: "Discord.Discord", category: "İletişim & Sosyal", category_order: 30, icon: "message", size_bytes: 1024 * 1024 * 80, description: "Oyuncular ve topluluklar için iletişim platformu." },
  { id: "telegram", name: "Telegram Desktop", winget_id: "Telegram.TelegramDesktop", category: "İletişim & Sosyal", category_order: 30, icon: "message", size_bytes: 1024 * 1024 * 35, description: "Hızlı ve güvenli mesajlaşma uygulaması." },
  { id: "slack", name: "Slack", winget_id: "Slack.Slack", category: "İletişim & Sosyal", category_order: 30, icon: "message", size_bytes: 1024 * 1024 * 75, description: "İş yerleri için mesajlaşma ve iş birliği." },
  { id: "whatsapp", name: "WhatsApp", winget_id: "WhatsApp.WhatsApp", category: "İletişim & Sosyal", category_order: 30, icon: "message", size_bytes: 1024 * 1024 * 90, description: "Popüler mesajlaşma uygulaması." },
  { id: "zoom", name: "Zoom", winget_id: "Zoom.Zoom", category: "İletişim & Sosyal", category_order: 30, icon: "message", size_bytes: 1024 * 1024 * 60, description: "Video konferans ve toplantı aracı." },
  
  { id: "spotify", name: "Spotify", winget_id: "Spotify.Spotify", category: "Medya & Oyun", category_order: 50, icon: "monitor", size_bytes: 1024 * 1024 * 70, description: "Müzik ve podcast platformu." },
  { id: "vlc", name: "VLC Media Player", winget_id: "VideoLAN.VLC", category: "Medya & Oyun", category_order: 50, icon: "monitor", size_bytes: 1024 * 1024 * 40, description: "Çok yönlü medya oynatıcı." },
  { id: "obs", name: "OBS Studio", winget_id: "OBSProject.OBSStudio", category: "Medya & Oyun", category_order: 50, icon: "monitor", size_bytes: 1024 * 1024 * 120, description: "Yayın ve ekran kaydı yazılımı." },
  { id: "steam", name: "Steam", winget_id: "Valve.Steam", category: "Medya & Oyun", category_order: 50, icon: "monitor", size_bytes: 1024 * 1024 * 2, description: "Dijital oyun platformu." },
  
  { id: "archive", name: "7-Zip", winget_id: "7zip.7zip", category: "Sistem & Araçlar", category_order: 70, icon: "settings", size_bytes: 1024 * 1024 * 2, description: "Yüksek sıkıştırma oranlı dosya arşivleyici." },
  { id: "rufus", name: "Rufus", winget_id: "Rufus.Rufus", category: "Sistem & Araçlar", category_order: 70, icon: "settings", size_bytes: 1024 * 1024 * 1, description: "Önyüklenebilir USB sürücü oluşturma aracı." },
  { id: "winrar", name: "WinRAR", winget_id: "RARLab.WinRAR", category: "Sistem & Araçlar", category_order: 70, icon: "settings", size_bytes: 1024 * 1024 * 3, description: "Güçlü arşiv yönetimi aracı." },
  
  { id: "adobe", name: "Adobe Acrobat Reader", winget_id: "Adobe.Acrobat.Reader.64-bit", category: "Ofis & Üretkenlik", category_order: 60, icon: "file-text", size_bytes: 1024 * 1024 * 250, description: "PDF görüntüleme ve düzenleme." },
  { id: "notion", name: "Notion", winget_id: "Notion.Notion", category: "Ofis & Üretkenlik", category_order: 60, icon: "file-text", size_bytes: 1024 * 1024 * 70, description: "Hepsi bir arada çalışma alanı." },
];

function App() {
  const [installers, setInstallers] = useState(LEGENDARY_APPS.map(a => ({...a, path: a.winget_id, dependencies: []})));
  const [selected, setSelected] = useState(new Set());
  const [installing, setInstalling] = useState(false);
  const [currentInstall, setCurrentInstall] = useState(null);
  const [installStatus, setInstallStatus] = useState({});
  const [installedIds, setInstalledIds] = useState(new Set());
  const [installProgress, setInstallProgress] = useState({ done: 0, total: 0 });
  const [appProgress, setAppProgress] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTheme, setCurrentTheme] = useState("studio");
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [menuHover, setMenuHover] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [diskUsage, setDiskUsage] = useState(null);

  const [activeCategory, setActiveCategory] = useState(null);
  const [customArgs, setCustomArgs] = useState({});
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showControlCenter, setShowControlCenter] = useState(true);
  const [logPanelHeight, setLogPanelHeight] = useState(220);
  const menuBarRef = useRef(null);
  const searchInputRef = useRef(null);
  const logEndRef = useRef(null);
  const isResizingLog = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(220);

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

    return () => {
      unlisten.then(f => f());
    };
  }, []);

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
    if (list.length > 0 && !activeCategory) setActiveCategory(list[0].name);
    return list;
  }, [installers]);

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

  const toggleSelect = (path) => {
    if (installing) return;
    const newSelected = new Set(selected);
    if (newSelected.has(path)) newSelected.delete(path);
    else newSelected.add(path);
    setSelected(newSelected);
  };

  const refreshInstalledStatus = async () => {
    try {
      const displayNames = await invoke("get_installed_winget_ids");
      const newInstalledIds = new Set();
      
      for (const app of installers) {
        const lowerName = app.name.toLowerCase();
        // Check if any registry DisplayName contains the app name or simple ID
        const isInstalled = displayNames.some(d => {
           const lowerD = d.toLowerCase();
           // Remove " LTS" or similar suffixes for broader matching
           const simpleName = lowerName.replace(" lts", "");
           return lowerD.includes(simpleName) || lowerD.includes(app.id.toLowerCase());
        });
        
        if (isInstalled) {
          newInstalledIds.add(app.winget_id);
        }
      }
      
      setInstalledIds(newInstalledIds);
    } catch (e) {
      console.error("Installation status check failed", e);
    }
  };

  const addLog = (msg, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, msg, type }, ...prev].slice(0, 100));
  };

  const startUninstall = async (app) => {
    if (installing) return;
    
    if (!window.confirm(`${app.name} programını sistemden kaldırmak istediğinize emin misiniz?`)) return;
    
    setInstalling(true);
    setShowLogs(true);
    addLog(`${app.name} için kaldırma işlemi başlatılıyor...`, "process");
    let wingetCmd = `winget uninstall --id ${app.winget_id} --silent --accept-source-agreements`;
    addLog(`> ${wingetCmd}`, "command");
    sounds.playClick();
    
    setInstallStatus((prev) => ({ ...prev, [app.path]: "installing" }));
    setCurrentInstall(app.name);

    try {
      await invoke("uninstall_winget_package", { packageId: app.winget_id });
      setInstallStatus((prev) => {
        const next = {...prev};
        delete next[app.path];
        return next;
      });
      addLog(`Başarılı: ${app.name} başarıyla kaldırıldı.`, "success");
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(app.path);
        return next;
      });
      refreshInstalledStatus();
      sounds.playSuccess();
    } catch (error) {
      console.error(`Kaldırma hatası (${app.name}):`, error);
      setInstallStatus((prev) => ({ ...prev, [app.path]: "error" }));
      addLog(`Hata (${app.name}): ${error}`, "error");
      sounds.playError();
    }
    
    setCurrentInstall(null);
    setInstalling(false);
  };

  const startInstall = async () => {
    if (selected.size === 0 || installing) return;
    
    setInstalling(true);
    setShowLogs(true);
    addLog("Winget kurulum oturumu başladı.", "info");
    sounds.playClick();

    const selectedApps = installers.filter((i) => selected.has(i.path));
    setInstallProgress({ done: 0, total: selectedApps.length });

    for (let idx = 0; idx < selectedApps.length; idx++) {
      const app = selectedApps[idx];
      setCurrentInstall(app.name);
      setInstallStatus((prev) => ({ ...prev, [app.path]: "installing" }));
      addLog(`İşlem başlatılıyor: ${app.name}`, "process");
      
      const wingetCmd = `winget install ${app.winget_id} --accept-package-agreements --accept-source-agreements`;
      addLog(`> ${wingetCmd}`, "command");

      try {
        await invoke("install_winget_package", { 
          packageId: app.winget_id
        });
        setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
        addLog(`Başarılı: ${app.name}`, "success");
        refreshInstalledStatus();
      } catch (error) {
        console.error(`Kurulum hatası (${app.name}):`, error);
        setInstallStatus((prev) => ({ ...prev, [app.path]: "error" }));
        addLog(`Hata (${app.name}): ${error}`, "error");
        sounds.playError();
      }
      setInstallProgress({ done: idx + 1, total: selectedApps.length });
    }

    addLog("Tüm kurulumlar tamamlandı.", "info");
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
        } catch(e) { addLog(`Dışa aktarma hatası: ${e}`, "error"); }
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
        } catch(e) { addLog(`İçe aktarma hatası: ${e}`, "error"); }
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
        alert("StashZero v0.1.0\nÇevrimdışı toplu uygulama yükleyici.\n\n© 2026 byGOG");
        break;
      default:
        break;
    }
  };

  const progressPercent =
    installProgress.total > 0
      ? Math.round((installProgress.done / installProgress.total) * 100)
      : 0;

  return (
    <div className={`app-layout theme-${currentTheme}`}>
      <div className="mesh-gradient" />
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-wrapper">
            <svg width="80" height="80" viewBox="0 0 100 100" className="project-logo-svg">
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00ff9f" />
                  <stop offset="100%" stopColor="#00c9ff" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#logo-grad)" strokeWidth="1.5" opacity="0.3" strokeDasharray="10 5" />
              <path d="M50 15 A35 35 0 0 1 85 50 A35 35 0 0 1 50 85 A35 35 0 0 1 15 50 A35 35 0 0 1 50 15" fill="none" stroke="url(#logo-grad)" strokeWidth="3" filter="url(#glow)" />
              <path d="M40 35 C35 35 32 38 32 42 C32 46 35 48 40 50 C45 52 48 54 48 58 C48 62 45 65 40 65" fill="none" stroke="url(#logo-grad)" strokeWidth="6" strokeLinecap="round" transform="translate(10, 0)" />
              <path d="M40 35 C35 35 32 38 32 42 C32 46 35 48 40 50 C45 52 48 54 48 58 C48 62 45 65 40 65" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" transform="translate(10, 0)" opacity="0.5" />
            </svg>
            <div className="logo-glow" />
          </div>
          <h1>STASH<span>ZERO</span><span>STUDIO EDITION</span></h1>
        </div>
        
        <div className="sidebar-nav">
          {categories.map(cat => (
            <div 
              key={cat.name} 
              className={`sidebar-item ${activeCategory === cat.name ? 'active' : ''}`}
              onClick={() => { setActiveCategory(cat.name); sounds.playClick(); }}
            >
              <div className="sidebar-item-left">
                 <SidebarIcon type={cat.icon} />
                 <span>{cat.name}</span>
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
             <div className="search-container">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Uygulama ara... (Ctrl+F)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
              <div className="path-display">
                 Legendary Application Store
              </div>
          </div>

          <div className="top-right">
             <button 
               className={`panel-toggle ${showControlCenter ? 'active' : ''}`}
               onClick={() => { setShowControlCenter(!showControlCenter); sounds.playClick(); }}
               title="Kontrol Merkezini Aç/Kapat"
             >
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
             </button>
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
                if (status === "done") cardClass += " done";
                if (status === "error") cardClass += " error";
                if (installedIds.has(app.winget_id)) cardClass += " installed";

                return (
                  <div 
                    key={app.path} 
                    className={cardClass} 
                    onClick={() => toggleSelect(app.path)}
                    onMouseMove={handleMouseMove}
                  >
                    <div className="app-icon">
                      <AppLogo id={app.id} className="brand-logo" />
                      {installedIds.has(app.winget_id) && (
                        <div className="installed-badge">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      )}
                    </div>
                    <div className="app-info">
                      <div className="app-name-row">
                        <span className="app-name">{app.name}</span>
                        {app.version && <span className="app-version-badge">{app.version}</span>}
                        {installedIds.has(app.winget_id) && <span className="app-installed-tag">Kurulu</span>}
                      </div>
                      <div className="app-meta">
                        <span className="app-size">{(app.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                        <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                          {installedIds.has(app.winget_id) && (
                            <div className="info-btn uninstall-btn" style={{color: "var(--text-secondary)"}} onClick={(e) => { e.stopPropagation(); startUninstall(app); }} title="Sistemden Kaldır">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </div>
                          )}
                          <div className="info-btn" onClick={(e) => e.stopPropagation()}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            <div className="info-tooltip">
                            <div className="tooltip-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                              <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' }}>
                                <AppLogo id={app.id} className="brand-logo" />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="tooltip-title" style={{ marginBottom: '2px' }}>{app.name}</span>
                                <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{app.winget_id}</span>
                              </div>
                            </div>
                            <div className="tooltip-desc">{app.description}</div>
                            <div className="tooltip-meta">Kategori: {app.category}</div>
                          </div>
                        </div>
                        </div>
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
                <button className="icon-btn-sm" onClick={() => setLogs([])} title="Kayıtları Temizle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
                <button className="icon-btn-sm close-btn" onClick={() => setShowLogs(false)} title="Günlüğü Kapat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
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
          </div>
        )}
      </main>

      {/* ─── Control Center (Right Sidebar) ─── */}
      {showControlCenter && (
        <aside className="control-center">
          <div className="cc-header">
            <h2>System Telemetry</h2>
            <button className="close-btn circle" onClick={() => setShowControlCenter(false)} title="Paneli Kapat">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
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
                    ? (installers.filter(i => selected.has(i.path)).reduce((acc, curr) => acc + curr.size_bytes, 0) / (1024*1024)).toFixed(1) + " MB"
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
                        <span className="tel-label">CPU Kullanımı</span>
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
                      <span className="tel-value">{Math.round((systemInfo.used_memory/systemInfo.total_memory)*100)}%</span>
                    </div>
                    <div className="tel-progress">
                      <div className="tel-fill" style={{ width: `${(systemInfo.used_memory/systemInfo.total_memory)*100}%` }} />
                    </div>
                  </div>
                  {systemInfo.disks && systemInfo.disks.map((disk, idx) => {
                    const used = disk.total_space - disk.available_space;
                    const pct = Math.round((used / disk.total_space) * 100);
                    return (
                      <div className="telemetry-card" key={idx}>
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
                          {Math.round(used / (1024*1024*1024))} GB / {Math.round(disk.total_space / (1024*1024*1024))} GB
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
                    <span>{systemInfo.net_in.toFixed(1)} KB/s</span>
                    <div className="net-activity"><div className="net-activity-bar" style={{width: `${Math.min(100, systemInfo.net_in / 10)}%`}}></div></div>
                  </div>
                  <div className="net-stat upload">
                    <div className="net-stat-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      <span>Yükleme</span>
                    </div>
                    <span>{systemInfo.net_out.toFixed(1)} KB/s</span>
                    <div className="net-activity"><div className="net-activity-bar" style={{width: `${Math.min(100, systemInfo.net_out / 10)}%`}}></div></div>
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
                    <span className="spec-key">İşlemci</span>
                    <span className="spec-val" title={systemInfo.cpu_model}>{systemInfo.cpu_model}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">Ekran Kartı</span>
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
                    <span className="spec-val">{Math.round(systemInfo.total_memory / (1024*1024*1024))} GB</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">Yerel IP</span>
                    <span className="spec-val">{systemInfo.local_ip}</span>
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
              <h2>Stash Ayarları</h2>
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
                  <button className={currentTheme === "neon" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "neon")}>Neon</button>
                  <button className={currentTheme === "sleek" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "sleek")}>Sleek</button>
                  <button className={currentTheme === "cyber" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "cyber")}>Cyber</button>
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="neon-button primary custom-save-btn" onClick={() => setShowSettings(false)}>Değişiklikleri Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
