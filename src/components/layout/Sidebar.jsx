import SidebarIcon from "../icons/SidebarIcon";
import ProjectLogo from "../icons/ProjectLogo";
import { sounds } from "../../utils/audio";

const Sidebar = ({ categories, activeCategory, setActiveCategory, handleMenuAction }) => {
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
              localStorage.setItem("stash-zero-active-category", cat.name);
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
          onClick={() => handleMenuAction("show-settings")}
        >
          <span>Ayarlar</span>
        </div>
        <div
          className="sidebar-item"
          onClick={() => handleMenuAction("toggle-logs")}
        >
          <span>Loglar</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
