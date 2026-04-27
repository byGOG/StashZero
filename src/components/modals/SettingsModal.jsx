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
  setPerfMode = () => {}
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
            <h2>Ayarlar</h2>
            <span className="settings-subtitle">Görünümü ve davranışı kişiselleştirin</span>
          </div>
          <button className="settings-close" onClick={() => setShowSettings(false)} aria-label="Kapat">
            <SettingsIcon name="close" />
          </button>
        </div>

        <div className="settings-body v2">
          <div className="settings-section">
            <div className="settings-section-label">Görünüm</div>

            <SettingRow icon="palette" title="Tema" desc="Arayüzün renk şemasını seçin." full>
              <div className="theme-grid">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    className={`theme-tile ${currentTheme === t.id ? "active" : ""}`}
                    onClick={() => handleMenuAction("change-theme", t.id)}
                    aria-label={t.label}
                  >
                    <span className="theme-swatch" style={{ background: t.swatch }} />
                    <span className="theme-tile-label">{t.label}</span>
                    {currentTheme === t.id && <span className="theme-tile-check"><SettingsIcon name="check" /></span>}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow icon="type" title="Yazı Tipi" desc="Modern tipografi ailesini belirleyin." full>
              <Segmented
                value={currentFont}
                options={FONTS}
                onChange={(id) => handleMenuAction("change-font", id)}
                render={(opt) => <span style={{ fontFamily: opt.family }}>{opt.label}</span>}
              />
            </SettingRow>

            <SettingRow icon="scale" title="Arayüz Ölçeği" desc="Tüm arayüz boyutunu yüzde cinsinden ayarlayın.">
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
            <div className="settings-section-label">Davranış</div>

            <SettingRow icon="broom" title="Otomatik Temizlik" desc="Kurulum sonrası kalıntı dosyaları otomatik siler.">
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

            <SettingRow icon="gauge" title="Performans Modu" desc="Düşük donanım için bulanıklık ve animasyonları azaltır." full>
              <Segmented
                value={perfMode}
                options={PERF_MODES}
                onChange={setPerfMode}
              />
            </SettingRow>

            <SettingRow icon="speaker" title="Ses Efektleri" desc="Etkileşimlerde ufak ses bildirimleri çalınsın.">
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
            <div className="settings-section-label">Sistem</div>

            <SettingRow icon="download" title="Güncellemeler" desc="GitHub üzerinden yayınlanan yeni sürümleri kontrol edin.">
              <button
                className="settings-action-btn"
                onClick={() => handleMenuAction("check-updates")}
              >
                Denetle
              </button>
            </SettingRow>
          </div>
        </div>

        <div className="settings-footer v2">
          <button className="settings-btn-ghost" onClick={resetDefaults}>Varsayılanlara Sıfırla</button>
          <button className="settings-btn-primary" onClick={() => setShowSettings(false)}>Tamamlandı</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
