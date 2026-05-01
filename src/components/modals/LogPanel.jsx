import { useState, useMemo } from "react";
import { safeInvoke } from "../../utils/tauri";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { sounds } from "../../utils/audio";

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
  const [copied, setCopied] = useState(false);
  const [logFilter, setLogFilter] = useState("all"); // all, error, success, process
  const [logSearch, setLogSearch] = useState("");

  const handleCopyAll = () => {
    const text = logs.map(l => `[${l.time}] ${l.msg}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveLogs = async () => {
    try {
      const text = logs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.msg}`).join('\n');
      const path = await save({
        filters: [{ name: 'StashZero Log', extensions: ['log', 'txt'] }],
        defaultPath: `stashzero-session-${new Date().getTime()}.log`
      });
      if (path) {
        await writeTextFile(path, text);
        sounds.playSuccess();
      }
    } catch (e) {
      console.error("Failed to save logs", e);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesFilter = logFilter === "all" || log.type === logFilter;
      const matchesSearch = log.msg.toLowerCase().includes(logSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [logs, logFilter, logSearch]);

  if (!showLogs) return null;

  return (
    <div 
      className={`log-panel modern-terminal ${showLogs ? 'visible' : ''}`} 
      style={{ height: logPanelHeight }}
    >
      <div className="log-resize-handle" onMouseDown={startLogResize} />
      
      <div className="terminal-header">
        <div className="log-header-left">
          <div className="log-header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
          </div>
          <div className="log-header-title">
            <h3>Log Analizi + Terminal</h3>
            <span className="log-count">{logs.length} Kayıt</span>
          </div>
        </div>

        <div className="terminal-controls">
          <div className="log-search-box">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Loglarda ara..." 
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />
          </div>

          <div className="log-filter-tabs">
            <button className={`filter-tab ${logFilter === 'all' ? 'active' : ''}`} onClick={() => setLogFilter('all')}>Hepsi</button>
            <button className={`filter-tab ${logFilter === 'error' ? 'active' : ''}`} onClick={() => setLogFilter('error')}>Hatalar</button>
            <button className={`filter-tab ${logFilter === 'success' ? 'active' : ''}`} onClick={() => setLogFilter('success')}>Başarı</button>
            <button className={`filter-tab ${logFilter === 'process' ? 'active' : ''}`} onClick={() => setLogFilter('process')}>Süreç</button>
          </div>

          <div className="terminal-divider" />

          <div className="shell-switcher-modern">
            <button 
              className={`shell-tab ${shellType === 'powershell' ? 'active' : ''}`}
              onClick={async () => {
                setShellType('powershell');
                await safeInvoke("kill_script");
                await ensureTerminalSession('powershell');
              }}
            >
              PS
            </button>
            <button 
              className={`shell-tab ${shellType === 'cmd' ? 'active' : ''}`}
              onClick={async () => {
                setShellType('cmd');
                await safeInvoke("kill_script");
                await ensureTerminalSession('cmd');
              }}
            >
              CMD
            </button>
          </div>

          <div className="terminal-divider" />

          {isSessionActive && (
             <div className="session-status">
               <span className="status-dot pulsing" />
               ONLINE
             </div>
          )}

          <button 
            className={`terminal-action-btn ${copied ? 'copied' : ''}`} 
            onClick={handleCopyAll} 
            title={copied ? "Kopyalandı!" : "Hepsini Kopyala"}
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            )}
          </button>

          <button className="terminal-action-btn" onClick={handleSaveLogs} title="Logları Dosyaya Kaydet">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          </button>

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
          {filteredLogs.length === 0 ? (
            <div className="empty-logs">Filtreye uygun log bulunamadı.</div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={i} className={`terminal-log-entry ${log.type}`}>
                <span className="log-timestamp">[{log.time}]</span>
                <span className="log-content-text">{log.msg}</span>
              </div>
            ))
          )}
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
