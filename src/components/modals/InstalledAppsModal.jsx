import { useState, useEffect, useMemo } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import AppLogo from "../icons/AppLogo";

const SettingsIcon = ({ name }) => {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "search": return <svg {...props}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case "box":    return <svg {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case "close":  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    default: return null;
  }
};

const InstalledAppsModal = ({ isOpen, onClose, getAllSystemSoftware, installers = [] }) => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      // setLoading(true) is already the default state or set when opening
      getAllSystemSoftware().then(list => {
        setApps(list || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      // Reset loading for next time
      setLoading(true);
    }
  }, [isOpen, getAllSystemSoftware]);

  const getAppId = (appName) => {
    const term = appName.toLowerCase();
    // Library içinde tam veya kısmi eşleşme ara
    const match = installers.find(i => 
      term === i.name.toLowerCase() ||
      term.startsWith(i.name.toLowerCase() + " ") ||
      (i.id && term.includes(i.id.toLowerCase()))
    );
    return match ? match.id : null;
  };

  const filtered = useMemo(() => {
    return apps.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
               .sort((a, b) => a.name.localeCompare(b.name));
  }, [apps, search]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay settings-overlay" onClick={onClose}>
      <Motion.div 
        className="modal-content settings-modal v2 large-list" 
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <div className="settings-aurora-glow" aria-hidden="true" />

        <div className="settings-header">
          <div className="settings-title-block">
            <h2>Sistemdeki Yazılımlar</h2>
            <span className="settings-subtitle">{apps.length} uygulama bulundu</span>
          </div>
          <button className="settings-close" onClick={onClose} aria-label="Kapat">
            <SettingsIcon name="close" />
          </button>
        </div>

        <div className="modal-search-bar">
          <div className="search-input-wrapper">
            <SettingsIcon name="search" />
            <input 
              type="text" 
              placeholder="Uygulama ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="settings-body v2 scrollable-list">
          {loading ? (
            <div className="modal-loading">
              <div className="spinner" />
              <span>Sistem taranıyor...</span>
            </div>
          ) : (
            <div className="installed-apps-grid">
              {filtered.map((app, idx) => (
                <div key={idx} className="installed-app-row">
                  <div className="app-icon-mini">
                    {getAppId(app.name) ? (
                      <AppLogo id={getAppId(app.name)} className="mini-brand-logo" />
                    ) : (
                      <SettingsIcon name="box" />
                    )}
                  </div>
                  <div className="app-details-mini">
                    <span className="app-name-mini">{app.name}</span>
                    <span className="app-version-mini">{app.version || "Sürüm: ?"}</span>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="empty-search">Sonuç bulunamadı.</div>
              )}
            </div>
          )}
        </div>

        <div className="settings-footer v2">
          <button className="settings-btn-primary" onClick={onClose}>Kapat</button>
        </div>
      </Motion.div>
    </div>
  );
};

export default InstalledAppsModal;
