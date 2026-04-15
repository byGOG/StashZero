import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';
import { open, save } from "@tauri-apps/plugin-dialog";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { sounds } from "./utils/audio";
import "./App.css";
import { LEGENDARY_APPS, POPULAR_DNS, SPECIAL_LOGOS } from "./data/library";

// Components
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import AppGrid from "./components/dashboard/AppGrid";
import ControlCenter from "./components/dashboard/ControlCenter";
import LogPanel from "./components/modals/LogPanel";
import SettingsModal from "./components/modals/SettingsModal";
import AboutModal from "./components/modals/AboutModal";

const CATEGORY_ICON_MAP = {
  "Web Tarayıcıları": "globe",
  "Eklentiler": "puzzle",
  "İletişim & Sosyal": "message-square",
  "Üretkenlik": "layout",
  "Multimedya": "video",
  "Geliştirme": "code",
  "Yapay Zeka": "activity",
  "Sistem Araçları": "settings",
  "Donanım & Test": "cpu",
  "Dosya Yönetimi": "folder",
  "İndirme Yöneticileri": "download",
  "Sanallaştırma": "box",
  "Ağ & Uzaktan Erişim": "terminal",
  "Güvenlik": "shield",
  "Gizlilik & Ağ Ayarları": "lock",
  "Oyun & Platformlar": "gaming",
  "Oyun Arşivi": "archive",
  "Film & Medya": "movie",
  "Uygulama Arşivleri": "package",
  "Torrent & Dizinler": "database",
  "Test & Web Analiz": "bar-chart",
  "Mobil & Modlu Sürümler": "smartphone",
  "Betikler & Otomasyon": "command"
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
  const [currentFont, setCurrentFont] = useState("outfit");
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
  const [fontSize, setFontSize] = useState(150);

  const searchInputRef = useRef(null);
  const logEndRef = useRef(null);
  const isResizingLog = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(220);
  const iframeRef = useRef(null);

  const [currentTrackArt, setCurrentTrackArt] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState('KEINEMUSIK');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Sync installers if LEGENDARY_APPS changes (Dev/HMR)
  useEffect(() => {
    setInstallers(LEGENDARY_APPS.map(a => ({ ...a, path: a.id, dependencies: [] })));
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

    const savedFont = localStorage.getItem("stash-zero-font");
    if (savedFont) setCurrentFont(savedFont);

    const savedCleanup = localStorage.getItem("stash-zero-cleanup");
    if (savedCleanup) setAutoCleanup(JSON.parse(savedCleanup));

    const savedSound = localStorage.getItem("stash-zero-sound");
    if (savedSound) setSoundEnabled(JSON.parse(savedSound));

    const savedFontSize = localStorage.getItem("stash-zero-font-size");
    if (savedFontSize) setFontSize(JSON.parse(savedFontSize));

    const savedCategory = localStorage.getItem("stash-zero-active-category");
    if (savedCategory) setActiveCategory(savedCategory);

    const timer = setTimeout(() => {
      invoke("close_splashscreen").catch(e => console.error("Splash error:", e));
    }, 3500);

    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.ctrlKey && (e.key === "a" || e.key === "A")) {
        if (document.activeElement !== searchInputRef.current) {
          e.preventDefault();
          selectAll();
        }
      }
      if (e.key === "F6") {
        e.preventDefault();
        startInstall();
      }
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
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].name);
    }
    refreshInstalledStatus();
  }, []);

  // Listen for progress events
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

    return () => {
      unlisten.then(f => f());
      unlistenScript.then(f => f());
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

  // SoundCloud API
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://w.soundcloud.com/player/api.js";
    script.async = true;
    script.onload = () => {
      if (iframeRef.current && window.SC) {
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
      if (document.body.contains(script)) document.body.removeChild(script);
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

  const categories = useMemo(() => {
    const map = new Map();
    for (const app of installers) {
      const cat = app.category;
      if (!map.has(cat)) {
        map.set(cat, { 
          name: cat, 
          order: app.category_order, 
          count: 0, 
          icon: CATEGORY_ICON_MAP[cat] || "rect" 
        });
      }
      map.get(cat).count++;
    }
    const list = Array.from(map.values()).sort((a, b) => a.order - b.order);
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

  const toggleSelect = async (path) => {
    if (installing) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    sounds.playClick();
  };

  const refreshInstalledStatus = async () => {
    try {
      const systemApps = await invoke("get_installed_winget_ids");
      const newInstalledApps = {};
      for (const app of installers) {
        const lowerName = app.name.toLowerCase();
        const lowerId = app.id.toLowerCase();
        let match = systemApps.find(([name, _]) => {
          const lowerN = name.toLowerCase();
          return lowerN === lowerName || lowerN === lowerId || lowerN.includes(lowerName);
        });
        if (match) newInstalledApps[app.id] = match[1] || "Kurulu";
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
        await invoke("uninstall_software", { path: app.uninstall_path });
        addLog(`Başarılı: ${app.name} sistemden kaldırıldı.`, "success");
      } else throw new Error("Kaldırma yolu tanımlanmamış.");
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
      try {
        if (app.script_cmd) {
          const cmd = app.id === "officetoolplus" ? "run_ps_script_logged" : "run_ps_script";
          await invoke(cmd, { script: app.script_cmd });
          setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
          addLog(`Başlatıldı: ${app.name}`, "success");
        } else if (app.download_url) {
          await invoke("install_exe_from_url", { url: app.download_url, packageId: app.id, appName: app.name, isPortable: !!app.portable });
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
  };

  const selectAll = () => { if (!installing) setSelected(new Set(installers.map((a) => a.path))); };
  const clearSelection = () => { if (!installing) setSelected(new Set()); };

  const handleMenuAction = async (action, data = null) => {
    sounds.playClick();
    switch (action) {
      case "show-settings": setShowSettings(true); break;
      case "toggle-logs": setShowLogs(!showLogs); break;
      case "change-theme": setCurrentTheme(data); localStorage.setItem("stash-zero-theme", data); break;
      case "change-font": setCurrentFont(data); localStorage.setItem("stash-zero-font", data); break;
      default: break;
    }
  };

  const handleIslandClick = () => setShowMusicPlayer(!showMusicPlayer);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div className={`app-layout theme-${currentTheme} font-${currentFont}`} style={{ "--app-font-scale": fontSize / 100 }}>
      <div className="mesh-gradient" />
      
      <Sidebar 
        categories={categories} 
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory} 
        handleMenuAction={handleMenuAction} 
      />

      <main className="main-content">
        <Header 
          searchInputRef={searchInputRef}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showMusicPlayer={showMusicPlayer}
          handleIslandClick={handleIslandClick}
          currentTrackArt={currentTrackArt}
          isMusicPlaying={isMusicPlaying}
          currentTrackTitle={currentTrackTitle}
        />

        <AppGrid 
          filteredApps={filteredApps}
          selected={selected}
          installStatus={installStatus}
          installedApps={installedApps}
          appProgress={appProgress}
          toggleSelect={toggleSelect}
          handleMouseMove={handleMouseMove}
          startUninstall={startUninstall}
          addLog={addLog}
          setShowLogs={setShowLogs}
        />

        <LogPanel 
          showLogs={showLogs}
          setShowLogs={setShowLogs}
          logPanelHeight={logPanelHeight}
          startLogResize={startLogResize}
          logs={logs}
          isSessionActive={isSessionActive}
          terminalInput={terminalInput}
          setTerminalInput={setTerminalInput}
          sendTerminalCommand={sendTerminalCommand}
          logEndRef={logEndRef}
          setLogs={setLogs}
        />
      </main>

      <ControlCenter 
        selected={selected}
        installers={installers}
        systemInfo={systemInfo}
        dnsOpen={dnsOpen}
        setDnsOpen={setDnsOpen}
        addLog={addLog}
        setSystemInfo={setSystemInfo}
        startInstall={startInstall}
        selectAll={selectAll}
        clearSelection={clearSelection}
        installing={installing}
      />

      <SettingsModal 
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        autoCleanup={autoCleanup}
        setAutoCleanup={setAutoCleanup}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        currentTheme={currentTheme}
        currentFont={currentFont}
        fontSize={fontSize}
        setFontSize={setFontSize}
        handleMenuAction={handleMenuAction}
      />

      <AboutModal 
        showAbout={showAbout}
        setShowAbout={() => setShowAbout(false)}
      />

      {/* Global Music Player Layer */}
      <div className={`island-backdrop ${showMusicPlayer ? 'visible' : ''}`} onClick={() => setShowMusicPlayer(false)} />
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
           width="100%" height="450" scrolling="no" frameBorder="no" 
           allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
           src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/keinemusik&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=true&show_teaser=true&visual=false&show_artwork=true"
        ></iframe>
      </div>
    </div>
  );
}

export default App;
