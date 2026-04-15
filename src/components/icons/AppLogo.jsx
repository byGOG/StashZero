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
          <svg width="24" height="24" viewBox="0 0 100 100">
            <path d="M30 50 C30 30, 45 30, 50 50 S70 70, 70 50" fill="none" stroke="#00ff9f" strokeWidth="12" strokeLinecap="round" />
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
