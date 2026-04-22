import ProjectLogo from "../icons/ProjectLogo";

const AboutModal = ({ showAbout, setShowAbout }) => {
  if (!showAbout) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowAbout(false)}>
      <div className="modal-content about-modal-modern" onClick={e => e.stopPropagation()}>
        <div className="modal-header-modern">
          <div className="header-badge">STASHZERO</div>
          <button className="close-btn-modern" onClick={() => setShowAbout(false)}>&times;</button>
        </div>

        <div className="modal-body about-body-modern">
          <div className="about-branding-modern">
            <div className="logo-container-modern">
              <ProjectLogo size={64} />
            </div>
            <div className="about-title-modern">
              <h3>StashZero</h3>
              <p>Minimalist Offline Ecosystem</p>
            </div>
          </div>

          <div className="about-stats-grid">
            <div className="about-stat-card">
              <span className="stat-label">Architecture</span>
              <span className="stat-value">Tauri 2.5 + Rust</span>
            </div>
            <div className="about-stat-card">
              <span className="stat-label">Environment</span>
              <span className="stat-value">React 19 Core</span>
            </div>
            <div className="about-stat-card">
              <span className="stat-label">Release</span>
              <span className="stat-value">v0.3.0 (Stable)</span>
            </div>
            <div className="about-stat-card">
              <span className="stat-label">Developer</span>
              <span className="stat-value">byGOG</span>
            </div>
          </div>

          <div className="tech-badges-row">
            <div className="tech-chip">Rust</div>
            <div className="tech-chip">React 19</div>
            <div className="tech-chip">Tauri</div>
            <div className="tech-chip">Vite</div>
          </div>

          <div className="about-description-modern">
            StashZero, modern ve hız odaklı bir çevrimdışı uygulama ekosistemidir.
            Profesyonel sistem yönetimi ve uygulama kurulum süreçlerini
            tek bir merkezden yönetmeniz için <strong>minimalist</strong> bir yaklaşımla tasarlandı.
          </div>

          <div className="about-credits-modern">
            <div className="credits-title">Hakkında</div>
            <div className="credits-text">
              Bu proje <a href="https://bygog.github.io/" target="_blank" rel="noopener noreferrer" className="credits-link">byGOG</a> tarafından, <a href="https://www.sordum.net/" target="_blank" rel="noopener noreferrer" className="credits-link">Sordum.net</a> topluluğunun sade ve kullanıcı odaklı anlayışından ilham alınarak geliştirilmiştir.
            </div>
          </div>

          <div className="about-footer-modern">
            <div className="copyright-line">© 2026 byGOG Software.</div>
            <div className="tagline">Crafted for perfection</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
