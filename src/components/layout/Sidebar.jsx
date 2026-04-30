import { memo } from "react";
import SidebarIcon from "../icons/SidebarIcon";
import ProjectLogo from "../icons/ProjectLogo";
import { sounds } from "../../utils/audio";
import { SettingKeys, setString } from "../../utils/settings";

const Sidebar = memo(function Sidebar({ categories, activeCategory, setActiveCategory, handleMenuAction, t }) {
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
          title={t('sidebar.system_apps')}
        >
          <div className="sidebar-item-left">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
             <span>{t('sidebar.system_apps')}</span>
          </div>
        </div>
        <div
          className="sidebar-item"
          onClick={() => handleMenuAction("toggle-logs")}
        >
          <span>{t('sidebar.logs')}</span>
        </div>
        <div
          className="sidebar-item"
          onClick={() => handleMenuAction("show-settings")}
        >
          <span>{t('sidebar.settings')}</span>
        </div>
        <div
          className="sidebar-item"
          onClick={() => handleMenuAction("show-about")}
        >
          <span>{t('sidebar.about')}</span>
        </div>
      </div>
    </aside>
  );
});

export default Sidebar;
