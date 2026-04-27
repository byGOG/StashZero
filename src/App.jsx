import { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue } from "react";
import { safeInvoke } from "./utils/tauri";
import { sounds } from "./utils/audio";
import { SettingKeys, getString, setString, getJSON } from "./utils/settings";
import "./App.css";

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
import { useLogPanelResize } from "./hooks/useLogPanelResize";
import { useTelemetry } from "./hooks/useTelemetry";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useCommandHistory } from "./hooks/useCommandHistory";
import { useSoundCloudPlayer } from "./hooks/useSoundCloudPlayer";

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
    installStatus,
    installedApps,
    appProgress,
    logs,
    isSessionActive,
    toggleSelect,
    addLog,
    proceedUninstall,
    startInstall,
    selectAll,
    clearSelection,
    setLogs,
    shellType,
    setShellType,
    ensureTerminalSession
  } = useInstallation();

  const [adminRequest, setAdminRequest] = useState({ show: false, app: null, action: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTheme, setCurrentTheme] = useState(() => getString(SettingKeys.theme, "aurora"));
  const [currentFont, setCurrentFont] = useState(() => getString(SettingKeys.font, "inter"));
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");

  const [activeCategory, setActiveCategory] = useState(() => getString(SettingKeys.activeCategory, null));
  const [autoCleanup, setAutoCleanup] = useState(() => getJSON(SettingKeys.cleanup, false));
  const [soundEnabled, setSoundEnabled] = useState(() => getJSON(SettingKeys.sound, true));
  const [dnsOpen, setDnsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(() => getJSON(SettingKeys.fontSize, 100));

  const searchInputRef = useRef(null);
  const logEndRef = useRef(null);

  const { mode: perfMode, setMode: setPerfMode, lowFx } = usePerformanceMode();
  const updateChecker = useUpdateChecker();
  const { height: logPanelHeight, setHeight: setLogPanelHeight, startResize: startLogResize } = useLogPanelResize();
  const [systemInfo, setSystemInfo] = useTelemetry({ lowFx });
  const commandHistory = useCommandHistory();
  const {
    iframeRef: musicIframeRef,
    isMounted: musicMounted,
    isPlaying: musicPlaying,
    showPanel: musicPanelOpen,
    setShowPanel: setMusicPanelOpen,
    trackArt: musicTrackArt,
    trackTitle: musicTrackTitle,
    togglePanel: toggleMusicPanel,
  } = useSoundCloudPlayer();

  const handleEscape = useCallback(() => {
    setSearchTerm("");
    setShowSettings(false);
    setShowAbout(false);
  }, []);

  useKeyboardShortcuts({
    searchInputRef,
    onSelectAll: selectAll,
    onStartInstall: () => startInstall(setShowLogs),
    onEscape: handleEscape,
  });

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
  }, [logs, showLogs]);

  const sendTerminalCommand = async () => {
    if (!terminalInput.trim()) return;
    try {
      if (!isSessionActive) {
        addLog(`Terminal başlatılıyor...`, "process");
        await ensureTerminalSession();
        await new Promise(r => setTimeout(r, 500));
      }

      const cmd = terminalInput;
      commandHistory.push(cmd);

      addLog(`> ${cmd}`, "command");
      setTerminalInput("");
      await safeInvoke("send_script_input", { input: cmd });
    } catch (err) {
      addLog(`Girdi hatası: ${err}`, "error");
    }
  };

  const handleHistoryNavigation = (direction) => {
    const next = commandHistory.navigate(direction);
    if (next != null) setTerminalInput(next);
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

  const effectiveCategory = useMemo(() => {
    if (categories.length === 0) return null;
    if (!activeCategory || !categories.some(c => c.name === activeCategory)) {
      return categories[0].name;
    }
    return activeCategory;
  }, [categories, activeCategory]);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredApps = useMemo(() => {
    const term = deferredSearchTerm.toLowerCase();
    if (term) {
      return installers.filter(app => app.name.toLowerCase().includes(term));
    }
    if (!effectiveCategory) return installers;
    return installers.filter(app => app.category === effectiveCategory);
  }, [installers, deferredSearchTerm, effectiveCategory]);



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
      case "change-theme": setCurrentTheme(data); setString(SettingKeys.theme, data); break;
      case "change-font": setCurrentFont(data); setString(SettingKeys.font, data); break;
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
        activeCategory={effectiveCategory} 
        setActiveCategory={setActiveCategory} 
        handleMenuAction={handleMenuAction} 
      />

      <main className="main-content">
        <Header 
          searchInputRef={searchInputRef}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showMusicPlayer={musicPanelOpen}
          handleIslandClick={toggleMusicPanel}
          currentTrackArt={musicTrackArt}
          isMusicPlaying={musicPlaying}
          currentTrackTitle={musicTrackTitle}
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
      {musicMounted && (
        <>
          <div className={`island-backdrop ${musicPanelOpen ? 'visible' : ''}`} onClick={() => setMusicPanelOpen(false)} />
          <div className={`island-player-dropdown global-layer ${musicPanelOpen ? 'visible' : 'hidden'}`}>
            <div className="dropdown-header">
              <div className="live-dot" />
              <span>STASH RADIO: KEINEMUSIK</span>
              <button className="island-close-btn" onClick={() => setMusicPanelOpen(false)}>&times;</button>
            </div>
            <iframe
              ref={musicIframeRef}
              id="sc-widget-player"
              className="soundcloud-full-player"
              width="100%" height="450" scrolling="no" frameBorder="no"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              src={`https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/keinemusik&color=%23ff5500&auto_play=${getJSON(SettingKeys.musicPlaying, false)}&hide_related=false&show_comments=true&show_user=true&show_reposts=true&show_teaser=true&visual=false&show_artwork=true`}
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
