const TelemetryIcon = ({ type }) => {
  switch (type) {
    case "cpu": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M9 9h6v6H9z" fill="currentColor" fillOpacity="0.2" />
        <path d="M15 2v2M9 2v2M20 15h2M20 9h2M15 20v2M9 20v2M2 15h2M2 9h2" />
      </svg>
    );
    case "ram": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 19v-3M10 19v-3M14 19v-3M18 19v-3M2 6v12h20V6H2z" />
        <path d="M21 10h-2M21 14h-2" />
      </svg>
    );
    case "disk": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M12 18h.01" strokeWidth="3" />
        <circle cx="12" cy="8" r="3" strokeOpacity="0.4" />
      </svg>
    );
    case "net": return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14l-4 4-4-4M19 12l-4-4-4 4" />
        <path d="M12 2v20" strokeOpacity="0.2" />
      </svg>
    );
    default: return null;
  }
};

export default TelemetryIcon;
