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
  const [openMenu, setOpenMenu] = useState(null);
  const [menuHover, setMenuHover] = useState(false);
  const menuBarRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (folderPath) {
      loadInstallers(folderPath);
    }
  }, [folderPath]);

  // Group installers by category
  const grouped = useMemo(() => {
    const map = new Map();
    for (const app of installers) {
      const cat = app.category || "Genel";
      if (!map.has(cat)) {
        map.set(cat, { name: cat, order: app.category_order, apps: [] });
      }
      map.get(cat).apps.push(app);
    }
    // Sort categories by their order
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [installers]);

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
      setInstallers(result);
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

  const startInstall = async () => {
    if (selected.size === 0 || installing) return;
    setInstalling(true);

    const appsToInstall = installers.filter((i) => selected.has(i.path));
    setInstallProgress({ done: 0, total: appsToInstall.length });

    for (let idx = 0; idx < appsToInstall.length; idx++) {
      const app = appsToInstall[idx];
      setCurrentInstall(app.name);
      setInstallStatus((prev) => ({ ...prev, [app.path]: "installing" }));

      try {
        await invoke("run_installer", { path: app.path });
        setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
      } catch (error) {
        console.error(`Kurulum hatası (${app.name}):`, error);
        setInstallStatus((prev) => ({ ...prev, [app.path]: "error" }));
      }
      setInstallProgress({ done: idx + 1, total: appsToInstall.length });
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

  const handleMenuAction = (action) => {
    setOpenMenu(null);
    switch (action) {
      case "open-folder":
        selectFolder();
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
      ],
    },
    {
      label: "Sık Kullanılanlar",
      id: "favori",
      items: [
        { label: "(Henüz favori yok)", disabled: true },
      ],
    },
    {
      label: "Seçenekler",
      id: "secenekler",
      items: [
        { label: "Ayarlar", disabled: true },
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
    <div className="container">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!item.disabled) handleMenuAction(item.action);
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
                      <span className="app-name">{app.name}</span>
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
    </div>
  );
}

export default App;
