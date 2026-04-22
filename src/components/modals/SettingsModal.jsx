import { useState, useEffect } from "react";
import { sounds } from "../../utils/audio";

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

  return (
    <div className="modal-overlay" onClick={() => setShowSettings(false)}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>StashZero Ayarları</h2>
          <button className="close-btn circle modern-modal-close" onClick={() => setShowSettings(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="modal-body settings-body">
          <div className="setting-card">
            <div className="setting-info">
              <span className="setting-title">Otomatik Temizlik</span>
              <span className="setting-desc">Kurulum bittikten sonra inen kalıntı dosyaları otomatik siler.</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={autoCleanup}
                onChange={(e) => {
                  setAutoCleanup(e.target.checked);
                  localStorage.setItem("stash-zero-cleanup", JSON.stringify(e.target.checked));
                }}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-card col">
            <div className="setting-info">
              <span className="setting-title">Performans Modu</span>
              <span className="setting-desc">Sanal makineler ve düşük donanımlı PC'lerde akıcılık için görsel efektleri (bulanıklık, sürekli animasyonlar, gölgeler) kapatır.</span>
            </div>
            <div className="theme-selector modern">
              <button className={perfMode === "auto" ? "active" : ""} onClick={() => setPerfMode("auto")}>Otomatik</button>
              <button className={perfMode === "full" ? "active" : ""} onClick={() => setPerfMode("full")}>Tam Efekt</button>
              <button className={perfMode === "low" ? "active" : ""} onClick={() => setPerfMode("low")}>Yüksek Performans</button>
            </div>
          </div>

          <div className="setting-card">
            <div className="setting-info">
              <span className="setting-title">Ses Efektleri</span>
              <span className="setting-desc">Etkileşimlerde ufak ses bildirimleri çalınsın.</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => {
                  setSoundEnabled(e.target.checked);
                  sounds.setEnabled(e.target.checked);
                  localStorage.setItem("stash-zero-sound", JSON.stringify(e.target.checked));
                }}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-card col">
            <div className="setting-info">
              <span className="setting-title">Tema Seçimi</span>
              <span className="setting-desc">Uygulama arayüzünün estetiğini belirleyin.</span>
            </div>
            <div className="theme-selector modern">
              <button className={currentTheme === "obsidian" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "obsidian")}>Obsidian</button>
              <button className={currentTheme === "violet" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "violet")}>Violet</button>
              <button className={currentTheme === "arctic" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "arctic")}>Arctic</button>
              <button className={currentTheme === "crimson" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "crimson")}>Crimson</button>
              <button className={currentTheme === "gold" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "gold")}>Gold</button>
              <button className={currentTheme === "minimalist" ? "active" : ""} onClick={() => handleMenuAction("change-theme", "minimalist")}>Minimalist</button>
            </div>
          </div>

          <div className="setting-card col">
            <div className="setting-info">
              <span className="setting-title">Yazı Tipi (Font) Stili</span>
              <span className="setting-desc">Estetik algınıza uygun modern web tipografisini seçin.</span>
            </div>
            <div className="theme-selector modern">
              <button className={currentFont === "orbitron" ? "active" : ""} onClick={() => handleMenuAction("change-font", "orbitron")}>Orbitron</button>
              <button className={currentFont === "outfit" ? "active" : ""} onClick={() => handleMenuAction("change-font", "outfit")}>Outfit</button>
              <button className={currentFont === "inter" ? "active" : ""} onClick={() => handleMenuAction("change-font", "inter")}>Inter</button>
              <button className={currentFont === "firacode" ? "active" : ""} onClick={() => handleMenuAction("change-font", "firacode")}>Fira Code</button>
              <button className={currentFont === "poppins" ? "active" : ""} onClick={() => handleMenuAction("change-font", "poppins")}>Poppins</button>
            </div>
          </div>

          <div className="setting-card">
            <div className="setting-info">
              <span className="setting-title">Arayüz Ölçeği</span>
              <span className="setting-desc">Tüm arayüzün (yazılar, butonlar, paneller) boyutunu ayarlayın (%{fontSize}).</span>
            </div>
            <div className="range-control">
              <input 
                type="range" 
                min="40" 
                max="170" 
                value={localFontSize} 
                onChange={(e) => {
                  setLocalFontSize(parseInt(e.target.value));
                }}
                onMouseUp={() => {
                  setFontSize(localFontSize);
                  localStorage.setItem("stash-zero-font-size", JSON.stringify(localFontSize));
                }}
                onTouchEnd={() => {
                  setFontSize(localFontSize);
                  localStorage.setItem("stash-zero-font-size", JSON.stringify(localFontSize));
                }}
                className="modern-slider"
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="neon-button primary custom-save-btn" onClick={() => setShowSettings(false)}>Değişiklikleri Kaydet</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
