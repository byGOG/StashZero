import { useState, useEffect } from "react";
import { sounds } from "../../utils/audio";
import { SettingKeys, setJSON } from "../../utils/settings";

const THEMES = [
  { id: "aurora", label: "Aurora", swatch: "linear-gradient(135deg, #7dd3fc 0%, #c4b5fd 50%, #f0abfc 100%)" },
  { id: "nebula", label: "Nebula", swatch: "linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #22d3ee 100%)" },
  { id: "sunset", label: "Sunset", swatch: "linear-gradient(135deg, #fde047 0%, #fb923c 50%, #f472b6 100%)" },
  { id: "mint",   label: "Mint",   swatch: "linear-gradient(135deg, #a7f3d0 0%, #34d399 50%, #22d3ee 100%)" },
  { id: "onyx",   label: "Onyx",   swatch: "linear-gradient(135deg, #1f2937 0%, #475569 50%, #e2e8f0 100%)" }
];

const FONTS = [
  { id: "inter",    label: "Inter",     family: "'Inter', sans-serif" },
  { id: "outfit",   label: "Outfit",    family: "'Outfit', sans-serif" },
  { id: "poppins",  label: "Poppins",   family: "'Poppins', sans-serif" },
  { id: "orbitron", label: "Orbitron",  family: "'Orbitron', sans-serif" },
  { id: "firacode", label: "Fira Code", family: "'Fira Code', monospace" }
];

const PERF_MODES = [
  { id: "auto", label: "Otomatik" },
  { id: "full", label: "Tam Efekt" },
  { id: "low",  label: "Yüksek Performans" }
];

const SettingsIcon = ({ name }) => {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "broom":    return <svg {...props}><path d="M19.36 2.72l1.42 1.42-5.72 5.71-1.41-1.41z"/><path d="M5.5 21l9.71-9.71-2.83-2.83L2.67 18.18 5.5 21z"/></svg>;
    case "gauge":    return <svg {...props}><path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>;
    case "speaker":  return <svg {...props}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>;
    case "palette":  return <svg {...props}><circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.4-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h2.5c2.5 0 4.5-2 4.5-4.5C22 6.1 17.5 2 12 2z"/></svg>;
    case "type":     return <svg {...props}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>;
    case "scale":    return <svg {...props}><circle cx="11" cy="11" r="8"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>;
    case "download": return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
    case "check":    return <svg {...props}><polyline points="20 6 9 17 4 12"/></svg>;
    case "close":    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    default: return null;
  }
};

const SettingRow = ({ icon, title, desc, children, full }) => (
  <div className={`setting-card ${full ? "col" : ""}`}>
    <div className="setting-info">
      <div className="setting-title-row">
        <span className="setting-icon-chip"><SettingsIcon name={icon} /></span>
        <span className="setting-title">{title}</span>
      </div>
      {desc && <span className="setting-desc">{desc}</span>}
    </div>
    {children}
  </div>
);

const Segmented = ({ value, options, onChange, render }) => (
  <div className="segmented-control" role="tablist">
    {options.map(opt => (
      <button
        key={opt.id}
        role="tab"
        aria-selected={value === opt.id}
        className={`segmented-option ${value === opt.id ? "active" : ""}`}
        onClick={() => onChange(opt.id)}
        style={opt.family ? { fontFamily: opt.family } : undefined}
      >
        {render ? render(opt) : opt.label}
      </button>
    ))}
  </div>
);

const SettingsModal = ({
  showSettings,
  setShowSettings,
  autoCleanup,
  setAutoCleanup,
  soundEnabled,
  setSoundEnabled,
  currentTheme,
  currentFont,
  fontSize,
  setFontSize,
  handleMenuAction,
  perfMode = "auto",
  setPerfMode = () => {},
  lang = "tr",
  changeLanguage = () => {},
  t
}) => {
  const [localFontSize, setLocalFontSize] = useState(fontSize);

  useEffect(() => {
    setLocalFontSize(fontSize);
  }, [fontSize]);

  if (!showSettings) return null;

  const resetDefaults = () => {
    sounds.playClick();
    handleMenuAction("change-theme", "aurora");
    handleMenuAction("change-font", "inter");
    changeLanguage("tr");
    setFontSize(100);
    setLocalFontSize(100);
    setJSON(SettingKeys.fontSize, 100);
    setPerfMode("auto");
    setAutoCleanup(false);
    setJSON(SettingKeys.cleanup, false);
    setSoundEnabled(true);
    sounds.setEnabled(true);
    setJSON(SettingKeys.sound, true);
  };

  return (
    <div className="modal-overlay settings-overlay" onClick={() => setShowSettings(false)}>
      <div className="modal-content settings-modal v2" onClick={(e) => e.stopPropagation()}>
        <div className="settings-aurora-glow" aria-hidden="true" />

        <div className="settings-header">
          <div className="settings-title-block">
            <h2>{t('modals.settings.title')}</h2>
            <span className="settings-subtitle">{t('modals.settings.subtitle')}</span>
          </div>
          <button className="settings-close" onClick={() => setShowSettings(false)} aria-label={t('modals.installed.close')}>
            <SettingsIcon name="close" />
          </button>
        </div>

        <div className="settings-body v2">
          <div className="settings-section">
            <div className="settings-section-label">{t('modals.settings.appearance')}</div>

            <SettingRow icon="palette" title={t('modals.settings.theme')} desc={t('modals.settings.theme_desc')} full>
              <div className="theme-grid">
                {THEMES.map(t_item => (
                  <button
                    key={t_item.id}
                    className={`theme-tile ${currentTheme === t_item.id ? "active" : ""}`}
                    onClick={() => handleMenuAction("change-theme", t_item.id)}
                    aria-label={t_item.label}
                  >
                    <span className="theme-swatch" style={{ background: t_item.swatch }} />
                    <span className="theme-tile-label">{t_item.label}</span>
                    {currentTheme === t_item.id && <span className="theme-tile-check"><SettingsIcon name="check" /></span>}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow icon="type" title={t('modals.settings.font')} desc={t('modals.settings.font_desc')} full>
              <Segmented
                value={currentFont}
                options={FONTS}
                onChange={(id) => handleMenuAction("change-font", id)}
                render={(opt) => <span style={{ fontFamily: opt.family }}>{opt.label}</span>}
              />
            </SettingRow>

            <SettingRow icon="scale" title={t('modals.settings.scale')} desc={t('modals.settings.scale_desc')}>
              <div className="scale-control">
                <input
                  type="range"
                  min="40"
                  max="170"
                  value={localFontSize}
                  onChange={(e) => setLocalFontSize(parseInt(e.target.value))}
                  onMouseUp={() => {
                    setFontSize(localFontSize);
                    setJSON(SettingKeys.fontSize, localFontSize);
                  }}
                  onTouchEnd={() => {
                    setFontSize(localFontSize);
                    setJSON(SettingKeys.fontSize, localFontSize);
                  }}
                  className="modern-slider v2"
                  style={{ "--slider-progress": `${((localFontSize - 40) / (170 - 40)) * 100}%` }}
                />
                <span className="scale-chip">%{localFontSize}</span>
              </div>
            </SettingRow>
          </div>

          <div className="settings-section">
            <div className="settings-section-label">{t('modals.settings.behavior')}</div>

            <SettingRow icon="broom" title={t('modals.settings.cleanup')} desc={t('modals.settings.cleanup_desc')}>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoCleanup}
                  onChange={(e) => {
                    setAutoCleanup(e.target.checked);
                    setJSON(SettingKeys.cleanup, e.target.checked);
                  }}
                />
                <span className="slider"></span>
              </label>
            </SettingRow>

            <SettingRow icon="gauge" title={t('modals.settings.perf')} desc={t('modals.settings.perf_desc')} full>
              <Segmented
                value={perfMode}
                options={[
                  { id: "auto", label: t('modals.settings.perf_auto') },
                  { id: "full", label: t('modals.settings.perf_high') },
                  { id: "low",  label: t('modals.settings.perf_low') }
                ]}
                onChange={setPerfMode}
              />
            </SettingRow>

            <SettingRow icon="speaker" title={t('modals.settings.sound')} desc={t('modals.settings.sound_desc')}>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => {
                    setSoundEnabled(e.target.checked);
                    sounds.setEnabled(e.target.checked);
                    setJSON(SettingKeys.sound, e.target.checked);
                  }}
                />
                <span className="slider"></span>
              </label>
            </SettingRow>
          </div>

          <div className="settings-section">
            <div className="settings-section-label">{t('modals.settings.system')}</div>

            <SettingRow icon="palette" title="Dil / Language" desc="Uygulama dilini seçin." full>
               <Segmented
                value={lang}
                options={[
                  { id: "tr", label: "Türkçe" },
                  { id: "en", label: "English" }
                ]}
                onChange={changeLanguage}
              />
            </SettingRow>

            <SettingRow icon="download" title={t('modals.settings.updates')} desc={t('modals.settings.updates_desc')}>
              <button
                className="settings-action-btn"
                onClick={() => handleMenuAction("check-updates")}
              >
                {t('modals.settings.check_now')}
              </button>
            </SettingRow>
          </div>
        </div>

        <div className="settings-footer v2">
          <button className="settings-btn-ghost" onClick={resetDefaults}>{t('modals.settings.reset')}</button>
          <button className="settings-btn-primary" onClick={() => setShowSettings(false)}>{t('modals.settings.done')}</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
