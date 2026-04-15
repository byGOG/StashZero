import ProjectLogo from "../icons/ProjectLogo";

const AboutModal = ({ showAbout, setShowAbout }) => {
  if (!showAbout) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowAbout(false)}>
      <div className="modal-content about-modal-premium" onClick={e => e.stopPropagation()}>
        <div className="modal-glow-effect" />
        
        <div className="modal-header-premium">
          <div className="header-badge">STASHZERO STUDIO</div>
          <button className="close-btn-premium" onClick={() => setShowAbout(false)}>&times;</button>
        </div>

        <div className="modal-body about-body-premium">
          <div className="about-branding-premium">
            <div className="logo-container-premium">
              <ProjectLogo size={80} />
              <div className="logo-ring-animation" />
            </div>
            <div className="about-title-premium">
              <h3>StashZero</h3>
              <p>Studio Edition</p>
            </div>
          </div>

          <div className="about-stats-grid">
            <div className="about-stat-card">
              <span className="stat-label">System Architecture</span>
              <span className="stat-value">Tauri 2.5 + Rust</span>
            </div>
            <div className="about-stat-card">
              <span className="stat-label">UI Environment</span>
              <span className="stat-value">React 19 Core</span>
            </div>
            <div className="about-stat-card">
              <span className="stat-label">Current Release</span>
              <span className="stat-value">v0.1.5 (Master)</span>
            </div>
            <div className="about-stat-card">
              <span className="stat-label">Lead Developer</span>
              <span className="stat-value">byGOG</span>
            </div>
          </div>

          <div className="tech-badges-row">
            <div className="tech-chip">Rust</div>
            <div className="tech-chip">React 19</div>
            <div className="tech-chip">Tauri</div>
            <div className="tech-chip">Vite</div>
          </div>

          <div className="about-description-premium">
            StashZero, modern ve hız odaklı bir çevrimdışı uygulama ekosistemidir. 
            <strong> Glassmorphism V3</strong> estetiğiyle tasarlanan platform, 
            profesyonel sistem yönetimi ve uygulama kurulum süreçlerini 
            tek bir merkezden yönetmenizi sağlar.
          </div>

          <div className="about-footer-premium">
            <div className="copyright-line">© 2026 byGOG Software. All rights reserved.</div>
            <div className="tagline">💎 Crafted for perfection</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
