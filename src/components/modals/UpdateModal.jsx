import { open as openUrl } from "@tauri-apps/plugin-shell";

const UpdateModal = ({ visible, info, checking, onClose, onSkip, onCheckNow, currentVersion }) => {
  if (!visible) return null;

  const hasUpdate = !!info?.available;
  const latest = info?.latest || "—";
  const notes = (info?.notes || "").trim();
  const url = info?.url || "https://github.com/byGOG/StashZero/releases/latest";

  const handleDownload = async (e) => {
    e.preventDefault();
    try {
      await openUrl(url);
    } catch (err) {
      console.error("Link açma hatası:", err);
    }
    onClose();
  };

  const shortNotes = notes.length > 420 ? notes.slice(0, 420).trimEnd() + "…" : notes;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content update-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn-glass" onClick={onClose} aria-label="Kapat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <div className="update-hero">
          <div className="update-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </div>
          <div className="update-hero-text">
            <span className="update-eyebrow">{hasUpdate ? "Yeni Sürüm Mevcut" : "Güncelleme Durumu"}</span>
            <h2>{hasUpdate ? "StashZero güncellenebilir" : "Uygulamanız güncel"}</h2>
          </div>
        </div>

        <div className="update-body">
          <div className="update-version-row">
            <div className="version-cell">
              <span className="version-label">Mevcut</span>
              <span className="version-value current">v{currentVersion}</span>
            </div>
            <div className="version-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
            </div>
            <div className="version-cell">
              <span className="version-label">{hasUpdate ? "En Son" : "Yayındaki"}</span>
              <span className={`version-value ${hasUpdate ? "latest" : ""}`}>
                {String(latest).startsWith("v") ? latest : `v${latest}`}
              </span>
            </div>
          </div>

          {hasUpdate && (
            <p className="update-message">
              Daha iyi bir deneyim için yeni sürüme geçmeniz önerilir. Güncellemeler iyileştirmeler, hata düzeltmeleri ve yeni özellikler içerir.
            </p>
          )}

          {!hasUpdate && !info?.error && (
            <p className="update-message">
              Şu anda en güncel sürümü kullanıyorsunuz. Teşekkürler!
            </p>
          )}

          {info?.error && !hasUpdate && (
            <p className="update-message warn">
              Güncelleme kontrol edilemedi. İnternet bağlantınızı kontrol edin ve tekrar deneyin.
            </p>
          )}

          {hasUpdate && shortNotes && (
            <div className="update-notes">
              <span className="notes-title">Sürüm Notları</span>
              <pre>{shortNotes}</pre>
            </div>
          )}
        </div>

        <div className="update-footer">
          {hasUpdate ? (
            <>
              <button className="update-btn ghost" onClick={onSkip}>Bu Sürümü Atla</button>
              <button className="update-btn ghost" onClick={onClose}>Daha Sonra</button>
              <button className="update-btn primary" onClick={handleDownload}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Şimdi Güncelle
              </button>
            </>
          ) : (
            <>
              <button className="update-btn ghost" onClick={onClose}>Kapat</button>
              <button className="update-btn primary" onClick={onCheckNow} disabled={checking}>
                {checking ? "Kontrol ediliyor…" : "Tekrar Kontrol Et"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
