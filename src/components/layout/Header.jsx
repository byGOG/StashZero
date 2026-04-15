const Header = ({
  searchInputRef,
  searchTerm,
  setSearchTerm,
  showMusicPlayer,
  handleIslandClick,
  currentTrackArt,
  isMusicPlaying,
  currentTrackTitle
}) => {
  return (
    <header className="top-bar">
      <div className="top-left">
        {/* Left side reserved or for branding */}
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
