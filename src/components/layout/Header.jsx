const formatSpeed = (kbps) => {
  if (kbps >= 1024 * 1024) return `${(kbps / (1024 * 1024)).toFixed(1)} GB/s`;
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`;
  return `${kbps.toFixed(1)} KB/s`;
};

const Header = ({
  searchInputRef,
  searchTerm,
  setSearchTerm,
  showMusicPlayer,
  handleIslandClick,
  currentTrackArt,
  isMusicPlaying,
  currentTrackTitle,
  systemInfo
}) => {
  return (
    <header className="top-bar">
      <div className="top-left">
        {systemInfo && (
          <div className="header-net-monitor">
            <div className="header-net-item download">
              <div className="net-icon-pulse down">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              </div>
              <span>{formatSpeed(systemInfo.net_in)}</span>
            </div>
            <div className="header-net-separator" />
            <div className="header-net-item upload">
              <div className="net-icon-pulse up">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
              <span>{formatSpeed(systemInfo.net_out)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="search-container">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Uygulama ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {!searchTerm && <div className="search-shortcut">CTRL + F</div>}
      </div>

      <div className={`music-island ${showMusicPlayer ? 'active' : ''}`}>
        <div className="island-pill" onClick={handleIslandClick}>
          <div className="island-icon-container">
            {currentTrackArt ? (
              <div className="art-wrapper">
                <img src={currentTrackArt.replace('large', 't500x500')} alt="Art" className="island-track-art" />
                {isMusicPlaying && (
                  <div className="audio-visualizer-mini">
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`audio-visualizer ${isMusicPlaying ? 'playing' : ''}`}>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
              </div>
            )}
          </div>
          <span className="island-text">{isMusicPlaying ? currentTrackTitle : 'KEINEMUSIK'}</span>
        </div>
      </div>

      <div className="top-right">
        {/* Telemetry is now persistent */}
      </div>
    </header>
  );
};

export default Header;
