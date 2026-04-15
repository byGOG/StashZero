const ProjectLogo = ({ size = 80, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={`project-logo-svg ${className}`}>
    <defs>
      <linearGradient id="logo-grad-unified" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00ff9f" />
        <stop offset="100%" stopColor="#00c9ff" />
      </linearGradient>
      <filter id="glow-unified">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <circle cx="50" cy="50" r="45" fill="none" stroke="url(#logo-grad-unified)" strokeWidth="1.5" opacity="0.3" strokeDasharray="10 5" />
    <path d="M50 15 A35 35 0 0 1 85 50 A35 35 0 0 1 50 85 A35 35 0 0 1 15 50 A35 35 0 0 1 50 15" fill="none" stroke="url(#logo-grad-unified)" strokeWidth="3" filter="url(#glow-unified)" />
    <path d="M30 50 C30 30, 45 30, 50 50 S70 70, 70 50" fill="none" stroke="url(#logo-grad-unified)" strokeWidth="10" strokeLinecap="round" filter="url(#glow-unified)" />
    <path d="M30 50 C30 30, 45 30, 50 50 S70 70, 70 50" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
  </svg>
);

export default ProjectLogo;
