import { open as openUrl } from "@tauri-apps/plugin-shell";
import ProjectLogo from "../icons/ProjectLogo";
import AboutHero from "../../assets/about-hero.png";
import ByGogMark from "../../assets/bygog-mark.png";

const AboutModal = ({ showAbout, setShowAbout }) => {
  if (!showAbout) return null;

  const handleLinkClick = async (e, url) => {
    e.preventDefault();
    try {
      await openUrl(url);
    } catch (err) {
      console.error("Link open error:", err);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setShowAbout(false)}>
      <div className="modal-content about-modern-glass" onClick={e => e.stopPropagation()}>
        <button className="close-btn-glass" onClick={() => setShowAbout(false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        
        <div className="about-hero-container">
          <img src={AboutHero} alt="StashZero Art" className="about-hero-img" />
          <span className="version-tag-float">STABLE v0.3.1</span>
          <div className="about-hero-overlay">
            <div className="about-brand-float">
              <ProjectLogo size={40} />
              <h3>StashZero</h3>
            </div>
          </div>
        </div>

        <div className="about-body-glass">
          <div className="about-header-glass">
            <h2>Minimalist Ecosystem</h2>
            <p>Modern ve hız odaklı çevrimdışı uygulama ekosistemi. Profesyonel sistem yönetimi süreçlerini tek merkezden yönetin.</p>
          </div>

          <div className="about-inspiration">
            <p>Sordum.net topluluğunun sade ve kullanıcı odaklı anlayışından ilham alınarak geliştirilmiştir. Emeklerine ve vizyonlarına derin saygılarımızla.</p>
          </div>

          <div className="about-footer-glass">
            <div className="footer-links">
              <a 
                href="https://bygog.github.io/" 
                onClick={(e) => handleLinkClick(e, "https://bygog.github.io/")}
                className="bygog-cyber-link"
              >
                <div className="cyber-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                </div>
                <span className="cyber-text">byGOG</span>
                <div className="cyber-glow"></div>
              </a>
              <span className="sep"></span>
              <a 
                href="https://www.sordum.net/" 
                onClick={(e) => handleLinkClick(e, "https://www.sordum.net/")}
                className="sordum-link"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                Sordum.net Topluluğu
              </a>
            </div>
            <span className="copyright-glass">© 2026 Software Environment</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
