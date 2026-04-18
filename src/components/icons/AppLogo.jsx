import { useState, useEffect } from "react";
import { SPECIAL_LOGOS, APP_ICON_MAP } from "../../data/library";

const AppLogo = ({ id, className, ...props }) => {
  const [logoSrc, setLogoSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Initialize and React to id change
  useEffect(() => {
    const initial = SPECIAL_LOGOS[id] || `https://cdn.simpleicons.org/${APP_ICON_MAP[id] || id}`;
    setLogoSrc(initial);
    setFailed(false);
    setAttempt(0);
  }, [id]);

  const handleError = () => {
    if (attempt === 0 && SPECIAL_LOGOS[id] && logoSrc === SPECIAL_LOGOS[id]) {
      // Fallback 1: Special logo failed, try mapped slug
      setLogoSrc(`https://cdn.simpleicons.org/${APP_ICON_MAP[id] || id}`);
      setAttempt(1);
    } else if (attempt <= 1) {
      // Fallback 2: Try using the id directly as a slug
      const fallbackId = `https://cdn.simpleicons.org/${id}`;
      if (logoSrc !== fallbackId) {
        setLogoSrc(fallbackId);
        setAttempt(2);
      } else {
        setFailed(true);
      }
    } else {
      setFailed(true);
    }
  };

  if (failed || !logoSrc) {
    return (
      <div className={`${className} logo-container`} {...props}>
        <div className="fallback-logo-wrap">
          <svg width="24" height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="fallback-sz-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f3ff" />
                <stop offset="100%" stopColor="#00ff9f" />
              </linearGradient>
            </defs>
            <polygon points="50,10 84,29 84,71 50,90 16,71 16,29" fill="none" stroke="url(#fallback-sz-grad)" strokeWidth="5" strokeLinejoin="round" />
            <ellipse cx="50" cy="50" rx="13" ry="18" fill="none" stroke="url(#fallback-sz-grad)" strokeWidth="6" strokeLinecap="round" />
            <line x1="36" y1="66" x2="64" y2="34" stroke="url(#fallback-sz-grad)" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} logo-container`} {...props}>
      <img
        src={logoSrc}
        alt={id}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={handleError}
      />
    </div>
  );
};

export default AppLogo;
