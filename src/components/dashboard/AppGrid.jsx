import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { motion, AnimatePresence } from "framer-motion";
import AppLogo from "../icons/AppLogo";

const containerVariantsFull = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03
    }
  }
};

const itemVariantsFull = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
};

const containerVariantsLow = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0 } }
};

const itemVariantsLow = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 1 }
};

const AppGrid = ({
  filteredApps,
  selected,
  installStatus,
  installedApps,
  appProgress,
  toggleSelect,
  handleMouseMove,
  startUninstall,
  addLog,
  setShowLogs,
  lowFx = false
}) => {
  const containerVariants = lowFx ? containerVariantsLow : containerVariantsFull;
  const itemVariants = lowFx ? itemVariantsLow : itemVariantsFull;
  const [shakeAppId, setShakeAppId] = useState(null);
  const hoverAnim = lowFx ? undefined : { y: -5, transition: { duration: 0.2 } };
  const tapAnim = lowFx ? undefined : { scale: 0.98 };

  return (
    <div className="content-scroll">
      {filteredApps.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="empty-state"
        >
          Görüntülenecek uygulama bulunamadı.
        </motion.div>
      ) : (
        <motion.div 
          className="category-apps"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={filteredApps[0]?.category || "search"} // Kategori değiştiğinde animasyonu tetikle
        >
          <AnimatePresence mode="popLayout">
            {filteredApps.map((app) => {
              const isSelected = selected.has(app.path);
              const status = installStatus[app.path];
              let cardClass = "app-card";
              if (isSelected) cardClass += " selected";
              if (status === "installing") cardClass += " installing";
              if (status === "done" && !app.script_cmd) cardClass += " done";
              if (status === "error") cardClass += " error";
              if (installedApps[app.id] && !app.script_cmd) cardClass += " installed";
              if (shakeAppId === app.id) cardClass += " shake-error";
              if (app.is_resource) cardClass += " resource-vibe";

              return (
                <motion.div
                  key={app.path}
                  layout={lowFx ? false : true}
                  variants={itemVariants}
                  className={cardClass}
                  onClick={() => {
                    if (installedApps[app.id] && !app.script_cmd) {
                      setShakeAppId(app.id);
                      setTimeout(() => setShakeAppId(null), 2000);
                      return;
                    }
                    if (app.is_resource && app.official_url) {
                      openUrl(app.official_url);
                    } else {
                      toggleSelect(app.path);
                    }
                  }}
                  onMouseMove={lowFx ? undefined : handleMouseMove}
                  whileHover={hoverAnim}
                  whileTap={tapAnim}
                >
                  <div className="app-icon">
                    <AppLogo id={app.id} className="brand-logo" />
                    {(installedApps[app.id] && !app.script_cmd) && (
                      <div className="installed-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    )}
                  </div>
                  
                  {(installedApps[app.id] && !app.script_cmd) && (
                    <div className="installed-overlay">
                      <div className="overlay-content">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        <span className="glass-status-text">Sistemde Mevcut</span>
                      </div>
                    </div>
                  )}
                  
                  <div className={`haptic-toast ${shakeAppId === app.id ? "shake-toast show" : ""}`}>
                    Yeniden kurmak için önce kaldırın!
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

                    {status === "installing" && appProgress[app.path] !== undefined && (
                      <div className="app-progress">
                        <div className="progress-bar-track">
                          <div className="progress-bar-fill" style={{ width: `${appProgress[app.path]}%` }} />
                        </div>
                        <span className="progress-percent">{appProgress[app.path]}%</span>
                      </div>
                    )}

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
                      {((installedApps[app.id] && app.portable && !app.script_cmd) || app.script_cmd) && !app.hide_launch && (
                        <button
                          className={`primary-launch-btn ${app.script_cmd ? 'script-vibe' : ''}`}
                          title={app.script_cmd ? "Betiği Çalıştır" : "Uygulamayı Başlat"}
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
                          {app.script_cmd ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="4 17 10 11 4 5"></polyline>
                              <line x1="12" y1="19" x2="20" y2="19"></line>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {status === "installing" && appProgress[app.path] === undefined && (
                    <div className="spinner" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default AppGrid;
