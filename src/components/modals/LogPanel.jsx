const LogPanel = ({
  showLogs,
  setShowLogs,
  logPanelHeight,
  startLogResize,
  logs,
  isSessionActive,
  terminalInput,
  setTerminalInput,
  sendTerminalCommand,
  logEndRef,
  setLogs
}) => {
  if (!showLogs) return null;

  return (
    <div className="log-panel" style={{ height: logPanelHeight }}>
      <div className="log-resize-handle" onMouseDown={startLogResize} />
      <div className="log-header">
        <div className="log-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
          <span>Sistem Günlüğü & Terminal</span>
          {isSessionActive && <div className="session-active-indicator" title="Aktif Oturum" />}
        </div>
        <div className="log-actions">
          {isSessionActive && (
             <div className="terminal-status-badge">SESSION ACTIVE</div>
          )}
          <button className="icon-btn-sm" onClick={() => setLogs([])} title="Kayıtları Temizle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
          <button className="icon-btn-sm close-btn" onClick={() => setShowLogs(false)} title="Günlüğü Kapat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <div className="log-panel-inner" style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
        <div className="log-content">
          {logs.length === 0 ? (
            <div className="log-empty">Henüz bir kayıt yok.</div>
          ) : (
            logs.slice().reverse().map((log, i) => (
              <div key={i} className={`log-entry ${log.type}`}>
                <span className="log-time">[{log.time}]</span>
                <span className="log-msg">{log.msg}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>

        {isSessionActive && (
          <div className="terminal-input-row" onClick={() => document.getElementById('term-input')?.focus()}>
            <span className="terminal-prompt">PS &gt;</span>
            <input
              id="term-input"
              type="text"
              className="terminal-input"
              placeholder="Komut yazın ve Enter'a basın..."
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendTerminalCommand();
              }}
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LogPanel;
