import { memo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import AppLogo from "../icons/AppLogo";

const AppCard = memo(function AppCard({
  app,
  isSelected,
  status,
  installedVersion,
  progress,
  shake,
  lowFx,
  onClick,
  onUninstall,
  onLaunch,
  onOpenUrl,
  onMouseMove,
}) {
  const isInstalled = !!installedVersion && !app.script_cmd;
  let cardClass = "app-card";
  if (isSelected) cardClass += " selected";
  if (status === "installing") cardClass += " installing";
  if (status === "done" && !app.script_cmd) cardClass += " done";
  if (status === "error") cardClass += " error";
  if (isInstalled) cardClass += " installed";
  if (shake) cardClass += " shake-error";
  if (app.is_resource) cardClass += " resource-vibe";
  if (lowFx) cardClass += " no-anim";

  const versionLabel =
    installedVersion && installedVersion !== "Portable" && installedVersion !== "Kurulu"
      ? installedVersion
      : app.version;

  return (
    <div
      className={cardClass}
      onClick={onClick}
      onMouseMove={lowFx ? undefined : onMouseMove}
    >
      <div className="app-icon">
        <AppLogo id={app.id} className="brand-logo" />
        {isInstalled && (
          <div className="installed-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        )}
      </div>

      {isInstalled && (
        <div className="installed-overlay">
          <div className="overlay-content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span className="glass-status-text">Sistemde Mevcut</span>
          </div>
        </div>
      )}

      <div className={`haptic-toast ${shake ? "shake-toast show" : ""}`}>
        Yeniden kurmak için önce kaldırın!
      </div>

      <div className="app-info">
        <div className="app-name-row">
          <span className="app-name" title={app.name}>{app.name}</span>
        </div>

        <div className="badges-row">
          {app.portable && <span className="app-badge badge-portable">Taşınabilir</span>}
          {(!app.is_resource && installedVersion) && <span className="app-badge badge-installed">Kurulu</span>}
          <span className="app-badge badge-version">{versionLabel}</span>
          {!app.is_resource && !app.script_cmd && app.size_bytes && (
            <span className="app-badge badge-size">{(app.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
          )}
        </div>

        <div className="app-description">{app.description}</div>

        {status === "installing" && progress !== undefined && (
          <div className="app-progress">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-percent">{progress}%</span>
          </div>
        )}

        <div className="app-actions-top">
          {app.official_url && (
            <button
              className="icon-action-btn"
              onClick={(e) => { e.stopPropagation(); onOpenUrl(app.official_url); }}
              title="Web Sitesi"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
          )}
          {isInstalled && (
            <button
              className="icon-action-btn delete-vibe"
              onClick={(e) => { e.stopPropagation(); onUninstall(app); }}
              title="Kaldır"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          )}
          {((isInstalled && app.portable) || app.script_cmd) && !app.hide_launch && (
            <button
              className={`primary-launch-btn ${app.script_cmd ? 'script-vibe' : ''}`}
              title={app.script_cmd ? "Betiği Çalıştır" : "Uygulamayı Başlat"}
              onClick={(e) => { e.stopPropagation(); onLaunch(app); }}
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
      {status === "installing" && progress === undefined && <div className="spinner" />}
    </div>
  );
});

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
  lowFx = false,
}) => {
  const [shakeAppId, setShakeAppId] = useState(null);

  const handleCardClick = (app) => {
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
  };

  const handleLaunch = (app) => {
    if (app.script_cmd) {
      const cmd = app.id === "officetoolplus" ? "run_ps_script_logged" : "run_ps_script";
      invoke(cmd, { script: app.script_cmd })
        .then(() => addLog(`${app.name} çalıştırılıyor...`, "success"))
        .catch((err) => addLog(`Hata: ${err}`, "error"));
      setShowLogs(true);
    } else {
      invoke("launch_portable", { url: app.download_url, appName: app.name, launchFile: app.launch_file })
        .then(() => addLog(`${app.name} başlatılıyor...`, "success"))
        .catch((err) => addLog(`Hata: ${err}`, "error"));
    }
  };

  if (filteredApps.length === 0) {
    return (
      <div className="content-scroll">
        <div className="empty-state">Görüntülenecek uygulama bulunamadı.</div>
      </div>
    );
  }

  return (
    <div className="content-scroll">
      <div className={`category-apps ${lowFx ? 'no-anim' : 'enter-anim'}`}>
        {filteredApps.map((app) => (
          <AppCard
            key={app.path}
            app={app}
            isSelected={selected.has(app.path)}
            status={installStatus[app.path]}
            installedVersion={installedApps[app.id]}
            progress={appProgress[app.path]}
            shake={shakeAppId === app.id}
            lowFx={lowFx}
            onClick={() => handleCardClick(app)}
            onUninstall={startUninstall}
            onLaunch={handleLaunch}
            onOpenUrl={openUrl}
            onMouseMove={handleMouseMove}
          />
        ))}
      </div>
    </div>
  );
};

export default AppGrid;
