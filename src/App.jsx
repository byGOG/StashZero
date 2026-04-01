import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";

function App() {
  const [folderPath, setFolderPath] = useState("");
  const [installers, setInstallers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [installing, setInstalling] = useState(false);
  const [currentInstall, setCurrentInstall] = useState(null);
  const [installStatus, setInstallStatus] = useState({});
  const [installProgress, setInstallProgress] = useState({ done: 0, total: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [currentTheme, setCurrentTheme] = useState("neon");
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [menuHover, setMenuHover] = useState(false);
  const menuBarRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuBarRef && menuBarRef.current && !menuBarRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load persistence and keyboard shortcuts
  useEffect(() => {
    const lastPath = localStorage.getItem("stash-zero-folder");
    if (lastPath) setFolderPath(lastPath);

    const savedFavs = localStorage.getItem("stash-zero-favorites");
    if (savedFavs) setFavorites(JSON.parse(savedFavs));

    const savedTheme = localStorage.getItem("stash-zero-theme");
    if (savedTheme) setCurrentTheme(savedTheme);

    const handleKeyDown = (e) => {
      // Search: Ctrl+F
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Open: Ctrl+O
      if (e.ctrlKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        selectFolder();
      }
      // Refresh: F5
      if (e.key === "F5") {
        e.preventDefault();
        if (folderPath) loadInstallers(folderPath);
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
  }, [folderPath, installers]); // Need installers and folderPath for some shortcuts

  useEffect(() => {
    if (folderPath) {
      loadInstallers(folderPath);
      localStorage.setItem("stash-zero-folder", folderPath);
    }
  }, [folderPath]);

  // Group installers by category and filter by search
  const grouped = useMemo(() => {
    const map = new Map();
    const term = searchTerm.toLowerCase();

    for (const app of installers) {
      if (term && !app.name.toLowerCase().includes(term)) continue;

      const cat = app.category || "Genel";
      if (!map.has(cat)) {
        map.set(cat, { name: cat, order: app.category_order, apps: [] });
      }
      map.get(cat).apps.push(app);
    }
    // Sort categories by their order
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [installers, searchTerm]);

  const getAutoCategory = (name) => {
    const n = name.toLowerCase();
    if (n.includes("chrome") || n.includes("firefox") || n.includes("opera") || n.includes("browser") || n.includes("edge")) return { name: "Web Tarayıcılar", order: 10 };
    if (n.includes("code") || n.includes("visual") || n.includes("node") || n.includes("python") || n.includes("git") || n.includes("studio")) return { name: "Geliştirici Araçları", order: 20 };
    if (n.includes("discord") || n.includes("slack") || n.includes("zoom") || n.includes("teams") || n.includes("telegram")) return { name: "İletişim & Sosyal", order: 30 };
    if (n.includes("vlc") || n.includes("spotify") || n.includes("player") || n.includes("steam") || n.includes("game")) return { name: "Medya & Oyun", order: 40 };
    if (n.includes("rar") || n.includes("zip") || n.includes("cleaner") || n.includes("driver") || n.includes("defender") || n.includes("optimizer")) return { name: "Sistem & Araçlar", order: 50 };
    return null;
  };

  const selectFolder = async () => {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "Kurulum Klasörünü Seçin",
      });
      if (selectedPath) {
        setFolderPath(selectedPath);
      }
    } catch (error) {
      console.error("Klasör seçilemedi:", error);
    }
  };

  const loadInstallers = async (path) => {
    try {
      const result = await invoke("get_installers", { dirPath: path });
      
      // Auto-categorize if "Genel" or missing
      const categorized = result.map(app => {
        if (app.category === "Genel") {
          const auto = getAutoCategory(app.name);
          if (auto) {
            return { ...app, category: auto.name, category_order: auto.order };
          }
        }
        return app;
      });

      setInstallers(categorized);
      setSelected(new Set());
      setInstallStatus({});
      setInstallProgress({ done: 0, total: 0 });
    } catch (error) {
      console.error("Uygulamalar yüklenemedi:", error);
    }
  };

  const toggleSelect = (path) => {
    if (installing) return;
    const newSelected = new Set(selected);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelected(newSelected);
  };

  const selectAllInCategory = (categoryApps) => {
    if (installing) return;
    const newSelected = new Set(selected);
    const allSelected = categoryApps.every((a) => newSelected.has(a.path));
    for (const app of categoryApps) {
      if (allSelected) {
        newSelected.delete(app.path);
      } else {
        newSelected.add(app.path);
      }
    }
    setSelected(newSelected);
  };

  const addLog = (msg, type = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, msg, type }, ...prev].slice(0, 100));
  };

  const startInstall = async () => {
    if (selected.size === 0 || installing) return;
    setInstalling(true);

    const appsToInstall = installers.filter((i) => selected.has(i.path));
    setInstallProgress({ done: 0, total: appsToInstall.length });

    addLog("Kurulum oturumu başladı.", "info");
    for (let idx = 0; idx < appsToInstall.length; idx++) {
      const app = appsToInstall[idx];
      setCurrentInstall(app.name);
      setInstallStatus((prev) => ({ ...prev, [app.path]: "installing" }));
      addLog(`Kuruluyor: ${app.name}...`, "process");

      try {
        await invoke("run_installer", { path: app.path });
        setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
        addLog(`Başarılı: ${app.name}`, "success");
      } catch (error) {
        console.error(`Kurulum hatası (${app.name}):`, error);
        setInstallStatus((prev) => ({ ...prev, [app.path]: "error" }));
        addLog(`Hata (${app.name}): ${error}`, "error");
      }
      setInstallProgress({ done: idx + 1, total: appsToInstall.length });
    }

    addLog("Tüm kurulumlar tamamlandı. Post-install kontrol ediliyor...", "info");
    
    try {
      const psResult = await invoke("run_post_install_script", { dirPath: folderPath });
      addLog(psResult, psResult.includes("başarıyla") ? "success" : "info");
    } catch (error) {
      addLog(`Post-install hatası: ${error}`, "error");
    }

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

  const addToFavorites = () => {
    if (!folderPath || favorites.includes(folderPath)) return;
    const newFavs = [...favorites, folderPath];
    setFavorites(newFavs);
    localStorage.setItem("stash-zero-favorites", JSON.stringify(newFavs));
    addLog(`Favorilere eklendi: ${folderPath}`, "info");
  };

  const removeFromFavorites = (path) => {
    const newFavs = favorites.filter(f => f !== path);
    setFavorites(newFavs);
    localStorage.setItem("stash-zero-favorites", JSON.stringify(newFavs));
  };

  const handleMenuAction = async (action, data = null) => {
    setOpenMenu(null);
    switch (action) {
      case "open-folder":
        selectFolder();
        break;
      case "open-favorite":
        setFolderPath(data);
        break;
      case "add-favorite":
        addToFavorites();
        break;
      case "refresh":
        if (folderPath) loadInstallers(folderPath);
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
      case "show-in-explorer":
        if (folderPath) {
          try {
             // We can use tauri shell plugin or custom command. 
             // In v2, opening a folder can be done via shell.open
             const { open: shellOpen } = await import("@tauri-apps/plugin-shell");
             await shellOpen(folderPath);
          } catch(e) {
             addLog(`Klasör açılamadı: ${e}`, "error");
          }
        }
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
      case "clear-cache":
        try {
          await invoke("clear_icon_cache");
          addLog("Simge önbelleği temizlendi.", "success");
        } catch(e) {
          addLog(`Önbellek temizlenemedi: ${e}`, "error");
        }
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

  const menuItems = [
    {
      label: "Dosya",
      id: "dosya",
      items: [
        { label: "Klasör Aç", action: "open-folder", shortcut: "Ctrl+O" },
        { label: "Yenile", action: "refresh", shortcut: "F5", disabled: !folderPath },
        { type: "separator" },
        { label: "Çıkış", action: "exit", shortcut: "Alt+F4" },
      ],
    },
    {
      label: "Komutlar",
      id: "komutlar",
      items: [
        { label: "Tümünü Seç", action: "select-all", shortcut: "Ctrl+A", disabled: installers.length === 0 },
        { label: "Seçimi Temizle", action: "clear-selection", disabled: selected.size === 0 },
        { type: "separator" },
        { label: "Sessiz Kurulum Başlat", action: "start-install", shortcut: "F6", disabled: selected.size === 0 || installing },
      ],
    },
    {
      label: "Araçlar",
      id: "araclar",
      items: [
        { label: "Klasör İçeriğini Tara", action: "refresh", disabled: !folderPath },
        { label: "Dosya Gezgininde Göster", action: "show-in-explorer", disabled: !folderPath },
        { type: "separator" },
        { label: showLogs ? "Logları Gizle" : "Logları Göster", action: "toggle-logs" },
        { label: "Logları Temizle", action: "clear-logs", disabled: logs.length === 0 },
      ],
    },
    {
      label: "Sık Kullanılanlar",
      id: "favori",
      items: [
        { label: "Mevcut Klasörü Ekle", action: "add-favorite", disabled: !folderPath || favorites.includes(folderPath) },
        { type: "separator" },
        ...(favorites.length > 0 
          ? favorites.map(path => ({ 
              label: path.split(/[\\/]/).pop() || path, 
              action: "open-favorite", 
              data: path 
            }))
          : [{ label: "(Henüz favori yok)", disabled: true }]
        ),
      ],
    },
    {
      label: "Seçenekler",
      id: "secenekler",
      items: [
        { label: "Ayarlar", action: "show-settings" },
      ],
    },
    {
      label: "Yardım",
      id: "yardim",
      items: [
        { label: "Hakkında", action: "about" },
        { label: "Sürüm: 0.1.0", disabled: true },
      ],
    },
  ];

  const progressPercent =
    installProgress.total > 0
      ? Math.round((installProgress.done / installProgress.total) * 100)
      : 0;

  return (
    <div className={`container theme-${currentTheme}`}>
      {/* ─── Menu Bar ─── */}
      <div className="menu-bar" ref={menuBarRef}>
        {menuItems.map((menu) => (
          <div
            key={menu.id}
            className={`menu-item${openMenu === menu.id ? " active" : ""}`}
            onMouseDown={(e) => {
              e.preventDefault();
              setOpenMenu(openMenu === menu.id ? null : menu.id);
            }}
            onMouseEnter={() => {
              if (openMenu !== null) setOpenMenu(menu.id);
            }}
          >
            <span className="menu-label">{menu.label}</span>
            {openMenu === menu.id && (
              <div className="menu-dropdown">
                {menu.items.map((item, idx) =>
                  item.type === "separator" ? (
                    <div key={idx} className="menu-separator" />
                  ) : (
                    <div
                      key={idx}
                      className={`menu-dropdown-item${item.disabled ? " disabled" : ""}`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (!item.disabled) {
                          handleMenuAction(item.action, item.data);
                        }
                      }}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="menu-shortcut">{item.shortcut}</span>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <header className="header">
        <h1>
          Stash<span>Zero</span>
        </h1>
        <p className="subtitle">
          Çevrimdışı toplu uygulama yükleyici &mdash; sessiz, hızlı, güvenli.
        </p>
      </header>

      <div className="search-section">
        <div className="folder-selection">
          <button
            className="neon-button"
            onClick={selectFolder}
            disabled={installing}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            Klasör Seç
          </button>
          <span className="folder-path">
            {folderPath || "Henüz bir klasör seçilmedi."}
          </span>
        </div>

        <div className="search-box">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="search-icon"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Uygulama ara... (Ctrl+F)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={!folderPath}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm("")}>
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Global progress bar */}
      {installing && (
        <div className="global-progress">
          <div className="progress-header">
            <span className="progress-label">
              Kuruluyor: <strong>{currentInstall}</strong>
            </span>
            <span className="progress-count">
              {installProgress.done}/{installProgress.total} &bull;{" "}
              {progressPercent}%
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="apps-list">
        {installers.length === 0 && folderPath && (
          <div className="empty-state">
            Bu klasörde .exe veya .msi dosyası bulunamadı.
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.name} className="category-group">
            <div
              className="category-header"
              onClick={() => selectAllInCategory(group.apps)}
            >
              <span className="category-name">{group.name}</span>
              <span className="category-count">{group.apps.length}</span>
            </div>
            <div className="category-apps">
              {group.apps.map((app) => {
                const isSelected = selected.has(app.path);
                const status = installStatus[app.path];

                let cardClass = "app-card";
                if (isSelected) cardClass += " selected";
                if (status === "installing") cardClass += " installing";
                if (status === "done") cardClass += " done";
                if (status === "error") cardClass += " error";

                return (
                  <div
                    key={app.path}
                    className={cardClass}
                    onClick={() => toggleSelect(app.path)}
                  >
                    <div className="checkbox">
                      {isSelected && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <div className="app-icon">
                      {app.icon_b64 ? (
                        <img
                          src={`data:image/png;base64,${app.icon_b64}`}
                          alt=""
                        />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                          <polyline points="2 17 12 22 22 17"></polyline>
                          <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <div className="app-info">
                      <div className="app-name-row">
                        <span className="app-name">{app.name}</span>
                        {app.version && <span className="app-version-badge">{app.version}</span>}
                      </div>
                      {status === "installing" && (
                        <span className="status-text installing-text">
                          <span className="spinner" /> Kuruluyor...
                        </span>
                      )}
                      {status === "done" && (
                        <span className="status-text done-text">✓ Tamam</span>
                      )}
                      {status === "error" && (
                        <span className="status-text error-text">✗ Hata</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {installers.length > 0 && (
        <div className="action-bar">
          <div className="selection-info">
            <strong>{selected.size}</strong> uygulama seçildi
          </div>
          <button
            className="neon-button primary"
            onClick={startInstall}
            disabled={selected.size === 0 || installing}
          >
            {installing
              ? `Kuruluyor (${installProgress.done}/${installProgress.total})...`
              : "Sessiz Kurulum Başlat"}
          </button>
        </div>
      )}

      {/* ─── Log Panel ─── */}
      {showLogs && (
        <div className="log-panel">
          <div className="log-header">
            <span>Yükleme Günlüğü</span>
            <div className="log-actions">
              <button onClick={() => setLogs([])}>Temizle</button>
              <button onClick={() => setShowLogs(false)}>&times;</button>
            </div>
          </div>
          <div className="log-content">
            {logs.length === 0 ? (
              <div className="log-empty">Henüz bir kayıt yok.</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`log-entry ${log.type}`}>
                  <span className="log-time">[{log.time}]</span>
                  <span className="log-msg">{log.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── Settings Modal ─── */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ayarlar</h2>
              <button className="close-modal" onClick={() => setShowSettings(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="setting-item">
                <label>
                  <span>Otomatik Tarama</span>
                  <input type="checkbox" defaultChecked />
                </label>
                <p className="setting-desc">Klasör seçildiğinde içeriği otomatik tara.</p>
              </div>
              <div className="setting-item">
                <label>
                  <span>Tema Seçimi</span>
                  <div className="theme-selector">
                    <button className={currentTheme === "neon" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "neon")}>Neon</button>
                    <button className={currentTheme === "sleek" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "sleek")}>Sleek</button>
                    <button className={currentTheme === "cyber" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "cyber")}>Cyber</button>
                  </div>
                </label>
              </div>
              <div className="setting-item">
                <button className="danger-button" onClick={() => handleMenuAction("clear-cache")}>
                  Simge Önbelleğini Temizle
                </button>
              </div>
              <div className="setting-item">
                <label>
                  <span>Sessiz Parametreleri</span>
                  <input type="text" placeholder="/S /VERYSILENT /SUPPRESSMSGBOXES" />
                </label>
              </div>
              <div className="setting-item">
                <button className="fav-button" onClick={() => { setShowSettings(false); handleMenuAction("add-favorite"); }}>
                  Mevcut Klasörü Favorilere Ekle
                </button>
              </div>
              {favorites.length > 0 && (
                <div className="settings-favorites">
                  <h3>Favori Klasörler</h3>
                  {favorites.map(path => (
                    <div key={path} className="fav-item">
                      <span title={path}>{path}</span>
                      <button onClick={() => removeFromFavorites(path)}>&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="neon-button primary" onClick={() => setShowSettings(false)}>Kaydet ve Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
