import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { sounds } from "./utils/audio";
import "./App.css";

const SidebarIcon = ({ type }) => {
  switch (type) {
    case "globe": return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
    case "terminal": return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>;
    case "message": return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
    case "palette": return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.688-1.688h1.906c3.107 0 5.648-2.541 5.648-5.648 0-4.79-4.031-8.719-8.719-8.719z"></path></svg>;
    case "monitor": return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>;
    case "file-text": return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
    case "settings": return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
    default: return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>;
  }
};

const getAutoCategory = (name) => {
  const n = name.toLowerCase();
  
  // Web Browsers (Priority 1)
  if (n.includes("chrome") || n.includes("firefox") || n.includes("opera") || n.includes("browser") || n.includes("edge") || n.includes("vivaldi") || n.includes("brave")) {
    return { name: "Web Tarayıcılar", order: 10, icon: "globe" };
  }
  
  // Dev Tools (Priority 2)
  if (n.includes("code") || n.includes("visual") || n.includes("node") || n.includes("python") || n.includes("git") || n.includes("studio") || n.includes("docker") || n.includes("sql") || n.includes("intellij") || n.includes("postman")) {
    return { name: "Geliştirici Araçları", order: 20, icon: "terminal" };
  }
  
  // Comm & Social (Priority 3)
  if (n.includes("discord") || n.includes("slack") || n.includes("zoom") || n.includes("teams") || n.includes("telegram") || n.includes("whatsapp") || n.includes("skype")) {
    return { name: "İletişim & Sosyal", order: 30, icon: "message" };
  }

  // Design & Graphics (Priority 4)
  if (n.includes("photoshop") || n.includes("adobe") || n.includes("illustrator") || n.includes("figma") || n.includes("blender") || n.includes("canvas") || n.includes("gimp") || n.includes("inkscape")) {
    return { name: "Tasarım & Grafik", order: 40, icon: "palette" };
  }
  
  // Media & Games (Priority 5)
  if (n.includes("vlc") || n.includes("spotify") || n.includes("player") || n.includes("steam") || n.includes("game") || n.includes("epic") || n.includes("riot") || n.includes("obs")) {
    return { name: "Medya & Oyun", order: 50, icon: "monitor" };
  }
  
  // Office & Productivity (Priority 6)
  if (n.includes("office") || n.includes("notion") || n.includes("pdf") || n.includes("evernote") || n.includes("trello") || n.includes("excel") || n.includes("word")) {
    return { name: "Ofis & Üretkenlik", order: 60, icon: "file-text" };
  }
  
  // System & Tools (Priority 7)
  if (n.includes("rar") || n.includes("zip") || n.includes("cleaner") || n.includes("driver") || n.includes("defender") || n.includes("optimizer") || n.includes("7zip") || n.includes("tool")) {
    return { name: "Sistem & Araçlar", order: 70, icon: "settings" };
  }
  
  return { name: "Genel", order: 100, icon: "box" };
};

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
  const [systemInfo, setSystemInfo] = useState(null);
  const [diskUsage, setDiskUsage] = useState(null);
  const [selectedAppMemo, setSelectedAppMemo] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [customArgs, setCustomArgs] = useState({});
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
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
      updateDiskUsage(folderPath);
    }
  }, [folderPath]);

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

  const updateDiskUsage = async (path) => {
    try {
      const usage = await invoke("get_disk_usage", { dirPath: path });
      setDiskUsage(usage);
    } catch (e) {
      console.error("Disk usage error", e);
    }
  };

  // Group installers by category
  const categories = useMemo(() => {
    const map = new Map();
    for (const app of installers) {
      const catInfo = getAutoCategory(app.name);
      const cat = catInfo.name;
      if (!map.has(cat)) {
        map.set(cat, { name: cat, order: catInfo.order, count: 0, icon: catInfo.icon });
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

  const clearCache = async () => {
    try {
      await invoke("clear_icon_cache");
      if (folderPath) loadInstallers(folderPath);
    } catch (e) {
      console.error("Cache clear error", e);
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
    
    // Check disk space (simple warning)
    if (diskUsage && diskUsage.free < 500 * 1024 * 1024) { // 500MB
       if (!confirm("Disk alanınız düşük (500MB altı). Kuruluma devam etmek istiyor musunuz?")) return;
    }

    setInstalling(true);
    addLog("Kurulum oturumu başladı.", "info");
    sounds.playClick();

    // Dependency sorting
    const selectedApps = installers.filter((i) => selected.has(i.path));
    
    // Sort logic (very basic topological-ish based on dependency names)
    const sortedApps = [...selectedApps].sort((a, b) => {
       if (a.dependencies.includes(b.name)) return 1;
       if (b.dependencies.includes(a.name)) return -1;
       return 0;
    });

    setInstallProgress({ done: 0, total: sortedApps.length });

    for (let idx = 0; idx < sortedApps.length; idx++) {
      const app = sortedApps[idx];
      setCurrentInstall(app.name);
      setInstallStatus((prev) => ({ ...prev, [app.path]: "installing" }));
      addLog(`Kuruluyor: ${app.name}...`, "process");

      try {
        await invoke("run_installer", { 
          path: app.path, 
          customArgs: customArgs[app.path] || null 
        });
        setInstallStatus((prev) => ({ ...prev, [app.path]: "done" }));
        addLog(`Başarılı: ${app.name}`, "success");
        
        if (autoCleanup) {
          try {
            await invoke("delete_installer", { path: app.path });
            addLog(`Temizlendi: ${app.path}`, "info");
          } catch(e) {
            addLog(`Temizleme hatası: ${e}`, "error");
          }
        }
      } catch (error) {
        console.error(`Kurulum hatası (${app.name}):`, error);
        setInstallStatus((prev) => ({ ...prev, [app.path]: "error" }));
        addLog(`Hata (${app.name}): ${error}`, "error");
        sounds.playError();
      }
      setInstallProgress({ done: idx + 1, total: sortedApps.length });
    }

    addLog("Kurulumlar tamamlandı.", "info");
    sounds.playSuccess();
    
    // Check post-install
    try {
      const psResult = await invoke("run_post_install_script", { dirPath: folderPath });
      addLog(psResult, psResult.includes("başarıyla") ? "success" : "info");
    } catch (error) {
      addLog(`Post-install hatası: ${error}`, "error");
    }

    setCurrentInstall(null);
    setInstalling(false);
    if (folderPath) loadInstallers(folderPath); // Refresh to reflect deletions
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
    sounds.playClick();
    switch (action) {
      case "open-folder":
        selectFolder();
        break;
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
        { label: "Seçili Paketi Kaydet (.stash)", action: "export-bundle", disabled: selected.size === 0 },
        { label: "Paket Yükle", action: "import-bundle" },
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
    <div className={`app-layout theme-${currentTheme}`}>
      <div className="mesh-gradient" />
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Stash<span>Zero</span></h1>
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
             <div className="path-display" onClick={selectFolder}>
                {folderPath || "Klasör seçilmedi..."}
             </div>
          </div>

          <div className="top-right">
             {systemInfo && (
               <div className="system-stats">
                  <div className="stat-group network">
                    <div className="net-item down">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"></path></svg>
                      <span>{systemInfo.net_in.toFixed(1)} KB/s</span>
                    </div>
                    <div className="net-item up">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 11l5-5 5 5M7 18l5-5 5 5"></path></svg>
                      <span>{systemInfo.net_out.toFixed(1)} KB/s</span>
                    </div>
                  </div>

                  <div className="stat-item">
                    <div className="stat-header"><span>CPU</span><span>{Math.round(systemInfo.cpu_usage)}%</span></div>
                    <div className="stat-bar"><div className="stat-fill" style={{ width: `${systemInfo.cpu_usage}%` }} /></div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-header"><span>RAM</span><span>{Math.round((systemInfo.used_memory/systemInfo.total_memory)*100)}%</span></div>
                    <div className="stat-bar"><div className="stat-fill" style={{ width: `${(systemInfo.used_memory/systemInfo.total_memory)*100}%` }} /></div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-header"><span>DISK</span><span>{Math.round(systemInfo.disk_usage)}%</span></div>
                    <div className="stat-bar"><div className="stat-fill" style={{ width: `${systemInfo.disk_usage}%` }} /></div>
                  </div>

                  <div className="specs-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                    <div className="specs-tooltip diagnostic">
                      <div className="diag-header">SYSTEM DIAGNOSTICS</div>
                      <div className="diag-grid">
                        <div className="diag-col">
                          <div className="diag-section">SYSTEM</div>
                          <div className="specs-row"><strong>OS:</strong> {systemInfo.os_version}</div>
                          <div className="specs-row"><strong>Kernel:</strong> {systemInfo.kernel_version}</div>
                          <div className="specs-row"><strong>Uptime:</strong> {Math.floor(systemInfo.uptime / 3600)}h {Math.floor((systemInfo.uptime % 3600) / 60)}m</div>
                          <div className="specs-row"><strong>Processes:</strong> {systemInfo.total_processes}</div>
                        </div>
                        <div className="diag-col">
                          <div className="diag-section">HARDWARE</div>
                          <div className="specs-row"><strong>CPU:</strong> {systemInfo.cpu_model}</div>
                          <div className="specs-row"><strong>Memory:</strong> {Math.round(systemInfo.total_memory / (1024*1024*1024))} GB</div>
                          <div className="specs-row"><strong>Swap:</strong> {Math.round(systemInfo.swap_used / (1024*1024))} / {Math.round(systemInfo.swap_total / (1024*1024))} MB</div>
                          <div className="specs-row"><strong>IP:</strong> {systemInfo.local_ip}</div>
                        </div>
                      </div>
                      <div className="diag-footer">
                        <button className="diag-action-btn" onClick={clearCache}>Clear Icon Cache</button>
                      </div>
                    </div>
                  </div>
               </div>
             )}
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

                return (
                  <div 
                    key={app.path} 
                    className={cardClass} 
                    onClick={() => toggleSelect(app.path)}
                    onMouseMove={handleMouseMove}
                  >
                    <div className="app-icon">
                      {app.icon_b64 ? (
                        <img src={`data:image/png;base64,${app.icon_b64}`} alt="" />
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                      )}
                    </div>
                    <div className="app-info">
                      <div className="app-name-row">
                        <span className="app-name">{app.name}</span>
                        {app.version && <span className="app-version-badge">{app.version}</span>}
                      </div>
                      <div className="app-meta">
                        <span className="app-size">{(app.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                        <div className="info-btn" onClick={(e) => { e.stopPropagation(); setSelectedAppMemo(app); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        </div>
                      </div>
                    </div>
                    {status === "installing" && <div className="spinner" />}
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
      </main>

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
                  <span>Otomatik Temizlik</span>
                  <input 
                    type="checkbox" 
                    checked={autoCleanup} 
                    onChange={(e) => {
                       setAutoCleanup(e.target.checked);
                       localStorage.setItem("stash-zero-cleanup", JSON.stringify(e.target.checked));
                    }} 
                  />
                </label>
                <p className="setting-desc">Kurulum bittikten sonra yükleyici dosyasını sil.</p>
              </div>
              <div className="setting-item">
                <label>
                  <span>Ses Efektleri</span>
                  <input 
                    type="checkbox" 
                    checked={soundEnabled} 
                    onChange={(e) => {
                       setSoundEnabled(e.target.checked);
                       sounds.setEnabled(e.target.checked);
                       localStorage.setItem("stash-zero-sound", JSON.stringify(e.target.checked));
                    }} 
                  />
                </label>
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
      {/* ─── App Details Modal ─── */}
      {selectedAppMemo && (
        <div className="modal-overlay" onClick={() => setSelectedAppMemo(null)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header">
                <h2>Uygulama Detayları</h2>
                <button className="close-modal" onClick={() => setSelectedAppMemo(null)}>&times;</button>
             </div>
             <div className="modal-body">
                <div className="details-grid">
                   <div className="details-icon">
                     {selectedAppMemo.icon_b64 ? (
                       <img src={`data:image/png;base64,${selectedAppMemo.icon_b64}`} alt="" />
                     ) : (
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                         <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                       </svg>
                     )}
                   </div>
                   <div className="details-info">
                      <h3 className="details-name">{selectedAppMemo.name}</h3>
                      <div className="details-row">
                         <span className="details-badge">Versiyon: {selectedAppMemo.version || "???"}</span>
                         <span className="details-badge">Boyut: {(selectedAppMemo.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                         <span className="details-badge">Sıra: {selectedAppMemo.order}</span>
                      </div>
                      
                      {selectedAppMemo.description && (
                         <p className="details-desc">{selectedAppMemo.description}</p>
                      )}

                      {selectedAppMemo.dependencies.length > 0 && (
                         <div className="details-deps">
                            <h4>Bağımlılıklar</h4>
                            <div className="deps-list">
                               {selectedAppMemo.dependencies.map(d => <span key={d} className="dep-chip">{d}</span>)}
                            </div>
                         </div>
                      )}

                      <div className="setting-item">
                         <label>Özel Kurulum Parametreleri</label>
                         <input 
                           className="custom-args-input" 
                           type="text" 
                           placeholder="/S /VERYSILENT ..." 
                           value={customArgs[selectedAppMemo.path] || ""}
                           onChange={(e) => setCustomArgs({...customArgs, [selectedAppMemo.path]: e.target.value})}
                         />
                      </div>
                   </div>
                </div>
             </div>
             <div className="modal-footer">
                <button className="neon-button primary" onClick={() => setSelectedAppMemo(null)}>Kapat</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
