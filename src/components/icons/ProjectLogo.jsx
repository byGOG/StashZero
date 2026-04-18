const ProjectLogo = ({ size = 80, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={`project-logo-svg ${className}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sz-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00f3ff" />
        <stop offset="55%" stopColor="#00ff9f" />
        <stop offset="100%" stopColor="#00ff9f" />
      </linearGradient>
      <linearGradient id="sz-fill" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00f3ff" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#00ff9f" stopOpacity="0.06" />
      </linearGradient>
      <filter id="sz-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <circle cx="50" cy="50" r="46" fill="none" stroke="url(#sz-stroke)" strokeWidth="1" strokeDasharray="2 5" opacity="0.35" />

    <polygon
      points="50,10 84,29 84,71 50,90 16,71 16,29"
      fill="url(#sz-fill)"
      stroke="url(#sz-stroke)"
      strokeWidth="2.5"
      strokeLinejoin="round"
      filter="url(#sz-glow)"
    />

    <polygon
      points="50,22 74,36 74,64 50,78 26,64 26,36"
      fill="none"
      stroke="url(#sz-stroke)"
      strokeWidth="0.8"
      strokeLinejoin="round"
      opacity="0.45"
    />

    <ellipse cx="50" cy="50" rx="13" ry="18" fill="none" stroke="url(#sz-stroke)" strokeWidth="4.5" strokeLinecap="round" filter="url(#sz-glow)" />
    <line x1="36" y1="66" x2="64" y2="34" stroke="url(#sz-stroke)" strokeWidth="4.5" strokeLinecap="round" filter="url(#sz-glow)" />
    <line x1="36" y1="66" x2="64" y2="34" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />

    <circle cx="50" cy="10" r="2" fill="#00ff9f" filter="url(#sz-glow)" />
    <circle cx="84" cy="29" r="1.6" fill="#00f3ff" />
    <circle cx="84" cy="71" r="1.6" fill="#00f3ff" />
    <circle cx="50" cy="90" r="2" fill="#00ff9f" filter="url(#sz-glow)" />
    <circle cx="16" cy="71" r="1.6" fill="#00f3ff" />
    <circle cx="16" cy="29" r="1.6" fill="#00f3ff" />
  </svg>
);

export default ProjectLogo;
