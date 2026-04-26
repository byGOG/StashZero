import { memo, useMemo, useState } from "react";
import { SPECIAL_LOGOS, APP_ICON_MAP } from "../../data/library";

const FallbackLogo = () => (
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
);

const AppLogo = memo(function AppLogo({ id, className, ...props }) {
  const sources = useMemo(() => {
    const list = [];
    if (SPECIAL_LOGOS[id]) list.push(SPECIAL_LOGOS[id]);
    const slug = APP_ICON_MAP[id];
    if (slug) list.push(`https://cdn.simpleicons.org/${slug}`);
    list.push(`https://cdn.simpleicons.org/${id}`);
    return Array.from(new Set(list));
  }, [id]);

  const [attempt, setAttempt] = useState(0);
  const failed = attempt >= sources.length;

  if (failed) {
    return (
      <div className={`${className} logo-container`} {...props}>
        <div className="fallback-logo-wrap"><FallbackLogo /></div>
      </div>
    );
  }

  return (
    <div className={`${className} logo-container`} {...props}>
      <img
        key={sources[attempt]}
        src={sources[attempt]}
        alt={id}
        loading="lazy"
        decoding="async"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={() => setAttempt((a) => a + 1)}
      />
    </div>
  );
});

export default AppLogo;
