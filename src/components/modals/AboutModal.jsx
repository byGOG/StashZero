import ProjectLogo from "../icons/ProjectLogo";

const AboutModal = ({ showAbout, setShowAbout }) => {
  if (!showAbout) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowAbout(false)}>
      <div className="modal-content about-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>StashZero Hakkında</h2>
          <button className="close-btn" onClick={() => setShowAbout(false)}>&times;</button>
        </div>
        <div className="modal-body about-body">
          <div className="about-branding">
            <ProjectLogo size={60} />
            <div className="about-title">
              <h3>StashZero</h3>
            </div>
          </div>
          <div className="about-info-grid">
            <div className="info-item">
              <span className="label">Geliştirici</span>
              <span className="value">byGOG</span>
            </div>
            <div className="info-item">
              <span className="label">Sürüm</span>
              <span className="value">v1.0.0 (Master)</span>
            </div>
            <div className="info-item">
              <span className="label">Mimari</span>
              <span className="value">Tauri 2.5 + React 18 (Turbo)</span>
            </div>
            <div className="info-item">
              <span className="label">Motor</span>
              <span className="value">Rust (Yüksek Performans)</span>
            </div>
          </div>
          <div className="about-desc">
            StashZero, modern ve hız odaklı bir çevrimdışı uygulama kütüphanesidir.
            Gelişmiş telemetri hub'ı ve tek tıkla kurulum özelliği ile
            profesyonel kullanıcılar için tasarlanmış bir "Ninite" klonudur.
          </div>
          <div className="about-copyright">
            © 2026 byGOG Software. Tüm hakları saklıdır.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
