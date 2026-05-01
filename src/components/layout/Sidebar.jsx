import { memo } from "react";
import SidebarIcon from "../icons/SidebarIcon";
import ProjectLogo from "../icons/ProjectLogo";
import { sounds } from "../../utils/audio";
import { SettingKeys, setString } from "../../utils/settings";

const Sidebar = memo(function Sidebar({ categories, activeCategory, setActiveCategory, handleMenuAction }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-wrapper">
          <ProjectLogo className="project-logo-svg" />
          <div className="logo-glow" />
        </div>
        <h1>StashZero</h1>
      </div>

      <div className="sidebar-nav">
        {categories.map(cat => (
          <div
            key={cat.name}
            className={`sidebar-item ${activeCategory === cat.name ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory(cat.name);
              setString(SettingKeys.activeCategory, cat.name);
              sounds.playClick();
            }}
          >
            <div className="sidebar-item-left">
              <SidebarIcon type={cat.icon} />
              <span title={cat.name}>{cat.name}</span>
            </div>
            <span className="sidebar-count">{cat.count}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div
          className="sidebar-item"
          onClick={() => handleMenuAction("show-installed")}
          title="Sistem Uygulamaları"
        >
          <div className="sidebar-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
          <span className="sidebar-label">Sistem Uygulamaları</span>
        </div>

        <div
          className="sidebar-item"
          onClick={() => handleMenuAction("toggle-logs")}
          title="Log + Terminal"
        >
          <div className="sidebar-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg></div>
          <span className="sidebar-label">Log + Terminal</span>
        </div>

        <div
          className="sidebar-item"
          onClick={() => handleMenuAction("show-settings")}
          title="Ayarlar"
        >
          <div className="sidebar-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div>
          <span className="sidebar-label">Ayarlar</span>
        </div>

        <div
          className="sidebar-item"
          onClick={() => handleMenuAction("show-about")}
          title="Hakkında"
        >
          <div className="sidebar-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></div>
          <span className="sidebar-label">Hakkında</span>
        </div>
      </div>
    </aside>
  );
});

export default Sidebar;
