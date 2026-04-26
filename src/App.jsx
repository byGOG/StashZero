import { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue } from "react";
import { safeInvoke } from "./utils/tauri";
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
import AdminRequestModal from "./components/modals/AdminRequestModal";
import SettingsModal from "./components/modals/SettingsModal";
import AboutModal from "./components/modals/AboutModal";
import UpdateModal from "./components/modals/UpdateModal";

// Hooks
import { useInstallation } from "./hooks/useInstallation";
import { usePerformanceMode } from "./hooks/usePerformanceMode";
import { useUpdateChecker } from "./hooks/useUpdateChecker";

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
  const {
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
    toggleSelect,
    refreshInstalledStatus,
    addLog,
    proceedUninstall,
    startInstall,
    selectAll,
    clearSelection,
    setLogs,
    setIsSessionActive,
    shellType,
    setShellType,
    ensureTerminalSession
  } = useInstallation();

  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [adminRequest, setAdminRequest] = useState({ show: false, app: null, action: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTheme, setCurrentTheme] = useState("aurora");
  const [currentFont, setCurrentFont] = useState("inter");
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");
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
  const [fontSize, setFontSize] = useState(100);

  const searchInputRef = useRef(null);
  const logEndRef = useRef(null);
  const isResizingLog = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(220);
  const iframeRef = useRef(null);

  const [currentTrackArt, setCurrentTrackArt] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState('KEINEMUSIK');
  const [isMusicPlaying, setIsMusicPlaying] = useState(() => {
    return localStorage.getItem("stash-zero-music-playing") === "true";
  });
  const [musicPlayerMounted, setMusicPlayerMounted] = useState(() => {
    return localStorage.getItem("stash-zero-music-mounted") === "true";
  });

  const { mode: perfMode, setMode: setPerfMode, lowFx } = usePerformanceMode();
  const updateChecker = useUpdateChecker();

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "auto", block: "nearest" });
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
    const validThemes = ["aurora", "nebula", "sunset", "mint", "onyx"];
    if (savedTheme && validThemes.includes(savedTheme)) {
      setCurrentTheme(savedTheme);
    } else if (savedTheme) {
      localStorage.setItem("stash-zero-theme", "aurora");
    }

    const savedFont = localStorage.getItem("stash-zero-font");
    if (savedFont) setCurrentFont(savedFont);

    const savedCleanup = localStorage.getItem("stash-zero-cleanup");
    if (savedCleanup) setAutoCleanup(JSON.parse(savedCleanup));

    const savedSound = localStorage.getItem("stash-zero-sound");
    if (savedSound) setSoundEnabled(JSON.parse(savedSound));

    const savedFontSize = localStorage.getItem("stash-zero-font-size");
    if (savedFontSize) {
      setFontSize(JSON.parse(savedFontSize));
    } else {
      setFontSize(100);
    }

    const savedCategory = localStorage.getItem("stash-zero-active-category");
    if (savedCategory) setActiveCategory(savedCategory);

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
        startInstall(setShowLogs);
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

  // Tiered telemetry polling:
  //   - Initial heavy fetch once (static + dynamic).
  //   - Fast tick (~2.5s) updates only CPU/RAM/net.
  //   - Slow tick (~30s) refreshes disks, Defender, UAC, theme, DNS, local IP.
  useEffect(() => {
    let cancelled = false;

    const mergeInfo = (patch) => {
      setSystemInfo((prev) => (prev ? { ...prev, ...patch } : patch));
    };

    const fetchInitial = async () => {
      const info = await safeInvoke("get_system_info");
      if (!cancelled && info) setSystemInfo(info);
    };

    const fetchFast = async () => {
      const info = await safeInvoke("get_fast_telemetry");
      if (!cancelled && info) mergeInfo(info);
    };

    const fetchSlow = async () => {
      const info = await safeInvoke("get_slow_telemetry");
      if (!cancelled && info) mergeInfo(info);
    };

    const fastMs = lowFx ? 5000 : 2500;
    const slowMs = lowFx ? 60000 : 30000;

    fetchInitial();
    const fastTimer = setInterval(() => {
      if (document.visibilityState === "visible") fetchFast();
    }, fastMs);
    const slowTimer = setInterval(() => {
      if (document.visibilityState === "visible") fetchSlow();
    }, slowMs);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        fetchFast();
        fetchSlow();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      clearInterval(fastTimer);
      clearInterval(slowTimer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [lowFx]);

  // Apply default theme on first launch only (when no saved choice exists).
  // Once the user picks a theme it is preserved across Windows light/dark changes.
  useEffect(() => {
    if (systemInfo && systemInfo.is_windows_dark !== undefined) {
      const savedTheme = localStorage.getItem("stash-zero-theme");
      if (!savedTheme && currentTheme !== "aurora") {
        setCurrentTheme("aurora");
        localStorage.setItem("stash-zero-theme", "aurora");
      }
    }
  }, [systemInfo?.is_windows_dark]);

  // SoundCloud API — lazy: only mount iframe + script on first open
  useEffect(() => {
    if (!musicPlayerMounted) return;

    let script = document.querySelector('script[data-sc-widget]');
    let created = false;
    if (!script) {
      script = document.createElement('script');
      script.src = "https://w.soundcloud.com/player/api.js";
      script.async = true;
      script.dataset.scWidget = "1";
      document.body.appendChild(script);
      created = true;
    }

    const wire = () => {
      if (!iframeRef.current || !window.SC) return;
      const widget = window.SC.Widget(iframeRef.current);
      let positionInterval;

      const updateTrackInfo = () => {
        widget.getCurrentSound((sound) => {
          if (sound) {
            const art = sound.artwork_url || sound.user.avatar_url;
            setCurrentTrackArt(art);
            setCurrentTrackTitle(sound.title);
          }
        });
      };

      const savePosition = () => {
        widget.getPosition((pos) => {
          if (pos > 0) {
            localStorage.setItem("stash-zero-music-position", pos.toString());
          }
        });
      };

      widget.bind(window.SC.Widget.Events.READY, () => {
        updateTrackInfo();
        const savedPos = localStorage.getItem("stash-zero-music-position");
        if (savedPos && localStorage.getItem("stash-zero-music-playing") === "true") {
          widget.seekTo(parseInt(savedPos));
        }
      });

      widget.bind(window.SC.Widget.Events.PLAY, () => {
        setIsMusicPlaying(true);
        localStorage.setItem("stash-zero-music-playing", "true");
        updateTrackInfo();
        
        // Start saving position
        if (positionInterval) clearInterval(positionInterval);
        positionInterval = setInterval(savePosition, 2000);

        // Resume from saved position if just started
        const savedPos = localStorage.getItem("stash-zero-music-position");
        if (savedPos) {
          widget.seekTo(parseInt(savedPos));
        }
      });

      widget.bind(window.SC.Widget.Events.PAUSE, () => {
        setIsMusicPlaying(false);
        localStorage.setItem("stash-zero-music-playing", "false");
        if (positionInterval) clearInterval(positionInterval);
        savePosition(); // Save one last time
      });

      widget.bind(window.SC.Widget.Events.FINISH, () => {
        setIsMusicPlaying(false);
        localStorage.setItem("stash-zero-music-playing", "false");
        localStorage.removeItem("stash-zero-music-position");
        if (positionInterval) clearInterval(positionInterval);
      });
    };

    if (window.SC) wire();
    else script.addEventListener('load', wire, { once: true });

    return () => {
      if (created && document.body.contains(script)) document.body.removeChild(script);
    };
  }, [musicPlayerMounted]);

  const sendTerminalCommand = async () => {
    if (!terminalInput.trim()) return;
    try {
      if (!isSessionActive) {
        addLog(`Terminal başlatılıyor...`, "process");
        await ensureTerminalSession();
        await new Promise(r => setTimeout(r, 500));
      }
      
      const cmd = terminalInput;
      setCommandHistory(prev => [cmd, ...prev.filter(c => c !== cmd)].slice(0, 50));
      setHistoryIndex(-1);

      addLog(`> ${cmd}`, "command");
      setTerminalInput("");
      await safeInvoke("send_script_input", { input: cmd });
    } catch (err) {
      addLog(`Girdi hatası: ${err}`, "error");
    }
  };

  const handleHistoryNavigation = (direction) => {
    if (commandHistory.length === 0) return;

    let newIndex = historyIndex + direction;
    if (newIndex >= commandHistory.length) newIndex = commandHistory.length - 1;
    if (newIndex < -1) newIndex = -1;

    setHistoryIndex(newIndex);
    if (newIndex === -1) {
      setTerminalInput("");
    } else {
      setTerminalInput(commandHistory[newIndex]);
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
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [installers]);

  useEffect(() => {
    if (categories.length === 0) return;
    const exists = categories.some(c => c.name === activeCategory);
    if (!activeCategory || !exists) {
      setActiveCategory(categories[0].name);
      localStorage.setItem("stash-zero-active-category", categories[0].name);
    }
  }, [categories, activeCategory]);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredApps = useMemo(() => {
    const term = deferredSearchTerm.toLowerCase();
    if (term) {
      return installers.filter(app => app.name.toLowerCase().includes(term));
    }
    if (!activeCategory) return installers;
    return installers.filter(app => app.category === activeCategory);
  }, [installers, deferredSearchTerm, activeCategory]);



  const startUninstall = async (targetApp) => {
    if (!targetApp) return;

    // Yönetici yetkisi gerektiren durum (Uninstall Script varsa)
    if (targetApp.uninstall_script) {
      setAdminRequest({ show: true, app: targetApp, action: "Uygulama Kaldırma" });
      return;
    }

    proceedUninstall(targetApp, setShowLogs);
  };


  const handleMenuAction = async (action, data = null) => {
    sounds.playClick();
    switch (action) {
      case "show-settings": setShowSettings(true); break;
      case "show-about": setShowAbout(true); break;
      case "toggle-logs": 
        if (!showLogs) setLogPanelHeight(450);
        setShowLogs(!showLogs); 
        break;
      case "change-theme": setCurrentTheme(data); localStorage.setItem("stash-zero-theme", data); break;
      case "change-font": setCurrentFont(data); localStorage.setItem("stash-zero-font", data); break;
      case "check-updates": updateChecker.checkNow(); break;
      default: break;
    }
  };

  const selectedTotalMb = useMemo(() => {
    if (selected.size === 0) return 0;
    let total = 0;
    for (const inst of installers) {
      if (selected.has(inst.path) && inst.size_bytes) total += inst.size_bytes;
    }
    return total / (1024 * 1024);
  }, [installers, selected]);

  const handleIslandClick = () => {
    if (!musicPlayerMounted) {
      setMusicPlayerMounted(true);
      localStorage.setItem("stash-zero-music-mounted", "true");
    }
    setShowMusicPlayer(!showMusicPlayer);
  };

  const mouseMoveRaf = useRef(0);
  const handleMouseMove = useCallback((e) => {
    const target = e.currentTarget;
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (mouseMoveRaf.current) return;
    mouseMoveRaf.current = requestAnimationFrame(() => {
      mouseMoveRaf.current = 0;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--mouse-x", `${clientX - rect.left}px`);
      target.style.setProperty("--mouse-y", `${clientY - rect.top}px`);
    });
  }, []);

  return (
    <div className={`app-layout theme-${currentTheme} font-${currentFont} ${lowFx ? 'low-fx' : ''}`} style={{ "--app-font-scale": fontSize / 100 }}>
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
          systemInfo={systemInfo}
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
          lowFx={lowFx}
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
          shellType={shellType}
          setShellType={setShellType}
          ensureTerminalSession={ensureTerminalSession}
          handleHistoryNavigation={handleHistoryNavigation}
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
          startInstall={() => startInstall(setShowLogs)}
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
        perfMode={perfMode}
        setPerfMode={setPerfMode}
      />

      <AboutModal
        showAbout={showAbout}
        setShowAbout={setShowAbout}
      />

      <UpdateModal
        visible={updateChecker.visible}
        info={updateChecker.updateInfo}
        checking={updateChecker.checking}
        currentVersion={updateChecker.currentVersion}
        onClose={updateChecker.dismiss}
        onSkip={updateChecker.skip}
        onCheckNow={updateChecker.checkNow}
      />

      {/* Global Music Player Layer — iframe mounts lazily on first open */}
      {musicPlayerMounted && (
        <>
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
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              src={`https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/keinemusik&color=%23ff5500&auto_play=${localStorage.getItem("stash-zero-music-playing") === "true"}&hide_related=false&show_comments=true&show_user=true&show_reposts=true&show_teaser=true&visual=false&show_artwork=true`}
            ></iframe>
          </div>
        </>
      )}
      {/* Floating Install Pill - Modern Bottom UI */}
      <div 
        className={`floating-install-pill ${(selected.size > 0 || installing) ? 'visible' : ''}`}
        style={{ 
          bottom: showLogs ? `${logPanelHeight + 30}px` : undefined,
          zIndex: 10005 
        }}
      >
        <div className="pill-inner">
          <div className="pill-info">
            <div className="pill-count">
              <span className="count-num">{selected.size}</span>
              <span className="count-label">Uygulama Seçildi</span>
            </div>
            <div className="pill-sep" />
            <div className="pill-size">
              {selectedTotalMb > 0 ? `${selectedTotalMb.toFixed(1)} MB` : "0 MB"}
            </div>
          </div>
          
          <div className="pill-buttons">
            <button className="pill-btn-clear" onClick={clearSelection} disabled={installing}>
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
            <button className={`pill-btn-install ${installing ? 'active' : ''}`} onClick={() => startInstall(setShowLogs)} disabled={installing}>
              {installing ? (
                <div className="spinner-xs" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
              )}
              <span>{installing ? (isUninstalling ? 'Kaldırılıyor...' : 'Yükleniyor...') : 'Kurulumu Başlat'}</span>
            </button>
          </div>
        </div>
      </div>

      <AdminRequestModal
        show={adminRequest.show}
        appName={adminRequest.app?.name}
        actionType={adminRequest.action}
        onConfirm={() => {
          setAdminRequest({ show: false, app: null, action: "" });
          proceedUninstall(adminRequest.app, setShowLogs);
        }}
        onCancel={() => setAdminRequest({ show: false, app: null, action: "" })}
      />
    </div>
  );
}

export default App;
