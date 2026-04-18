import { safeInvoke } from "../../utils/tauri";

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
  setLogs,
  shellType,
  setShellType,
  ensureTerminalSession,
  handleHistoryNavigation
}) => {
  if (!showLogs) return null;

  return (
    <div 
      className={`log-panel modern-terminal ${showLogs ? 'visible' : ''}`} 
      style={{ height: logPanelHeight }}
    >
      <div className="log-resize-handle" onMouseDown={startLogResize} />
      
      <div className="terminal-header">
        <div className="terminal-title">
          <div className="terminal-icon-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
          </div>
          <span>STASHZERO TERMİNAL</span>
        </div>

        <div className="terminal-controls">
          <div className="shell-switcher-modern">
            <button 
              className={`shell-tab ${shellType === 'powershell' ? 'active' : ''}`}
              onClick={async () => {
                setShellType('powershell');
                await safeInvoke("kill_script");
                await ensureTerminalSession('powershell');
              }}
            >
              PowerShell
            </button>
            <button 
              className={`shell-tab ${shellType === 'cmd' ? 'active' : ''}`}
              onClick={async () => {
                setShellType('cmd');
                await safeInvoke("kill_script");
                await ensureTerminalSession('cmd');
              }}
            >
              Komut İstemi
            </button>
          </div>

          <div className="terminal-divider" />

          {isSessionActive && (
             <div className="session-status">
               <span className="status-dot pulsing" />
               ÇEVRİMİÇİ
             </div>
          )}

          <button className="terminal-action-btn" onClick={() => setLogs([])} title="Terminali Temizle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
          
          <button className="terminal-action-btn close" onClick={() => setShowLogs(false)} title="Terminali Kapat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div className="terminal-body">
        <div className="terminal-welcome">
          <div className="welcome-ascii">
            {` ███████╗████████╗ █████╗ ███████╗██╗  ██╗███████╗███████╗██████╗  ██████╗ 
 ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║  ██║╚══███╔╝██╔════╝██╔══██╗██╔═══██╗
 ███████╗   ██║   ███████║███████║███████║  ███╔╝ █████╗  ██████╔╝██║   ██║
 ╚════██║   ██║   ██╔══██║╚════██║██╔══██║ ███╔╝  ██╔══╝  ██╔══██╗██║   ██║
 ███████║   ██║   ██║  ██║███████║██║  ██║███████╗███████╗██║  ██║╚██████╔╝
 ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ `}
          </div>
          <p style={{ fontWeight: 900, letterSpacing: '1px', color: 'var(--accent-primary)' }}>STASHZERO CORE // TERMİNAL</p>
          <p className="welcome-meta" style={{ opacity: 0.6 }}>Gelişmiş sistem yönetimi ve otomasyon arayüzü.</p>
        </div>

        <div className="log-entries-container">
          {logs.map((log, i) => (
            <div key={i} className={`terminal-log-entry ${log.type}`}>
              <span className="log-timestamp">[{log.time}]</span>
              <span className="log-content-text">{log.msg}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      <div className="terminal-input-container">
        <div className="terminal-input-wrapper">
          <div className="terminal-input-prompt">
            <span className="prompt-symbol">λ</span>
            <span className="prompt-shell">{shellType === 'powershell' ? 'ps' : 'cmd'}</span>
            <span className="prompt-dir">~</span>
          </div>
          <input
            id="term-input"
            type="text"
            className="terminal-modern-input"
            placeholder={isSessionActive ? "Bir komut yazın..." : "Oturum başlatılıyor..."}
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendTerminalCommand();
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                handleHistoryNavigation(1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                handleHistoryNavigation(-1);
              }
            }}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
};

export default LogPanel;
