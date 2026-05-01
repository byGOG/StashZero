import { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue } from "react";
import { MotionConfig } from "framer-motion";
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
import InstalledAppsModal from "./components/modals/InstalledAppsModal";
import ProfilesModal from "./components/modals/ProfilesModal";

// Hooks
import { useInstallation } from "./hooks/useInstallation";
import { usePerformanceMode } from "./hooks/usePerformanceMode";
import { useUpdateChecker } from "./hooks/useUpdateChecker";
import { useLogPanelResize } from "./hooks/useLogPanelResize";
import { useTelemetry } from "./hooks/useTelemetry";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useCommandHistory } from "./hooks/useCommandHistory";
import { useLibrary } from "./hooks/useLibrary";
import { useSoundCloudPlayer } from "./hooks/useSoundCloudPlayer";
import { useTranslation } from "./i18n/useTranslation";

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
    selected,
    installing,
    isUninstalling,
    installStatus,
    installedApps,
    installProgress,
    appProgress,
    logs,
    isSessionActive,
    updatesAvailable,
    toggleSelect,
    addLog,
    proceedUninstall,
    startInstall,
    selectAll,
    clearSelection,
    loadSelection,
    exportSelection,
    importSelection,
    getAllSystemSoftware,
    setLogs,
    shellType,
    setShellType,
    ensureTerminalSession
  } = useInstallation();

  const { apps: installers, isUpdating: isLibraryUpdating, updateLibrary } = useLibrary();
  const { t, lang, changeLanguage } = useTranslation();

  const [adminRequest, setAdminRequest] = useState({ show: false, app: null, action: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [currentTheme, setCurrentTheme] = useState(() => getString(SettingKeys.theme, "aurora"));
  const [currentFont, setCurrentFont] = useState(() => getString(SettingKeys.font, "inter"));
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showInstalled, setShowInstalled] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");

  const [activeCategory, setActiveCategory] = useState(() => getString(SettingKeys.activeCategory, null));
  const [autoCleanup, setAutoCleanup] = useState(() => getJSON(SettingKeys.cleanup, false));
  const [soundEnabled, setSoundEnabled] = useState(() => getJSON(SettingKeys.sound, true));
  const [dnsOpen, setDnsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(() => getJSON(SettingKeys.fontSize, 100));
  const [favorites, setFavorites] = useState(() => new Set(getJSON(SettingKeys.favorites, [])));

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
    const map = {};
    installers.forEach((app) => {
      if (!map[app.category]) {
        map[app.category] = {
          name: app.category,
          icon: CATEGORY_ICON_MAP[app.category] || "package",
          count: 0,
          order: app.category_order || 999,
        };
      }
      map[app.category].count++;
    });
    const baseCats = Object.values(map).sort((a, b) => a.order - b.order);
    
    if (favorites.size > 0) {
      return [
        { name: "Favoriler", icon: "star", count: favorites.size, order: -1 },
        ...baseCats
      ];
    }
    return baseCats;
  }, [installers, favorites]);

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
    let result = installers;

    if (term) {
      result = installers.filter(app => app.name.toLowerCase().includes(term));
    } else if (effectiveCategory) {
      if (activeCategory === "Favoriler") {
        result = installers.filter(a => favorites.has(a.id));
      } else {
        result = installers.filter(a => a.category === effectiveCategory);
      }
    }

    if (sortBy !== "default") {
      result = [...result].sort((a, b) => {
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "name_desc") return b.name.localeCompare(a.name);
        if (sortBy === "size_asc") return (a.size_bytes || 0) - (b.size_bytes || 0);
        if (sortBy === "size_desc") return (b.size_bytes || 0) - (a.size_bytes || 0);
        return 0;
      });
    }

    return result;
  }, [installers, deferredSearchTerm, activeCategory, favorites, effectiveCategory, sortBy]);

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
      case "show-installed": setShowInstalled(true); break;
      case "toggle-logs": 
        if (!showLogs) setLogPanelHeight(450);
        setShowLogs(!showLogs); 
        break;
      case "change-theme": setCurrentTheme(data); setString(SettingKeys.theme, data); break;
      case "change-font": setCurrentFont(data); setString(SettingKeys.font, data); break;
      case "change-lang": changeLanguage(data); break;
      case "check-updates": updateChecker.checkNow(); break;
      case "toggle-favorite": 
        setFavorites(prev => {
          const next = new Set(prev);
          if (next.has(data)) next.delete(data);
          else next.add(data);
          setJSON(SettingKeys.favorites, Array.from(next));
          return next;
        });
        break;
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
    <MotionConfig reducedMotion={lowFx ? "always" : "user"}>
    <div className={`app-layout theme-${currentTheme} font-${currentFont} ${lowFx ? 'low-fx' : ''}`} style={{ "--app-font-scale": fontSize / 100 }}>
      <div className="mesh-gradient" />
      
      <Sidebar 
        categories={categories} 
        activeCategory={effectiveCategory} 
        setActiveCategory={setActiveCategory} 
        handleMenuAction={handleMenuAction} 
        t={t}
      />

      <main className="main-content">
        <Header 
          searchInputRef={searchInputRef}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          setSortBy={setSortBy}
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
          t={t}
          lang={lang}
          updatesAvailable={updatesAvailable}
          favorites={favorites}
          onToggleFavorite={(id) => handleMenuAction("toggle-favorite", id)}
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
          lowFx={lowFx}
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
        lang={lang}
        changeLanguage={(l) => handleMenuAction("change-lang", l)}
        t={t}
      />

      <AboutModal
        showAbout={showAbout}
        setShowAbout={setShowAbout}
        t={t}
      />

      <UpdateModal
        isOpen={updateChecker.showModal}
        onClose={() => updateChecker.setShowModal(false)}
        updateData={updateChecker.updateData}
        currentVersion={updateChecker.currentVersion}
        onCheckNow={updateChecker.checkNow}
      />

      <InstalledAppsModal
        isOpen={showInstalled}
        onClose={() => setShowInstalled(false)}
        getAllSystemSoftware={getAllSystemSoftware}
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
            {installing ? (
              <div className="pill-install-progress">
                <div className="pill-progress-text">
                  <span className="count-num">{installProgress.done} / {installProgress.total}</span>
                  <span className="count-label">Tamamlandı</span>
                </div>
                <div className="pill-mini-progress">
                  <div 
                    className="pill-mini-fill" 
                    style={{ width: `${(installProgress.done / installProgress.total) * 100}%` }} 
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="pill-count">
                  <span className="count-num">{selected.size}</span>
                  <span className="count-label">Uygulama Seçildi</span>
                </div>
                <div className="pill-sep" />
                <div className="pill-size">
                  {selectedTotalMb > 0 ? `${selectedTotalMb.toFixed(1)} MB` : "0 MB"}
                </div>
              </>
            )}
          </div>
          
          <div className="pill-buttons">
            <button className="pill-btn-secondary" onClick={() => setShowProfiles(true)} disabled={installing} title="Profiller & Paket Yönetimi">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </button>
            <div className="pill-sep-v" />
            <button className="pill-btn-clear" onClick={clearSelection} disabled={installing} title="Seçimi Temizle">
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

      <ProfilesModal
        isOpen={showProfiles}
        onClose={() => setShowProfiles(false)}
        selected={selected}
        setSelected={loadSelection}
        installers={installers}
        installedApps={installedApps}
        exportSelection={exportSelection}
        importSelection={importSelection}
        addLog={addLog}
        t={t}
      />
    </div>
    </MotionConfig>
  );
}

export default App;
