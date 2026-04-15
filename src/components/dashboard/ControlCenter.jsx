import { safeInvoke } from "../../utils/tauri";
import TelemetryIcon from "../icons/TelemetryIcon";
import { POPULAR_DNS, SPECIAL_LOGOS } from "../../data/library";
import { sounds } from "../../utils/audio";

const formatSpeed = (kbps) => {
  if (kbps >= 1024 * 1024) return `${(kbps / (1024 * 1024)).toFixed(1)} GB/s`;
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`;
  return `${kbps.toFixed(1)} KB/s`;
};

const ControlCenter = ({
  selected,
  installers,
  systemInfo,
  dnsOpen,
  setDnsOpen,
  addLog,
  setSystemInfo,
  startInstall,
  selectAll,
  clearSelection,
  installing
}) => {
  if (!systemInfo) return (
    <aside className="control-center">
      <div className="cc-header">
        <h2>Sistem Telemetrisi</h2>
      </div>
      <div className="cc-content">
         <div className="spinner-container" style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <div className="spinner" />
         </div>
      </div>
    </aside>
  );

  return (
    <aside className="control-center">
      <div className="cc-header">
        <h2>Sistem Telemetrisi</h2>
      </div>

      <div className="cc-content">
        <div className="cc-section">
          <h3 className="cc-section-title">Aktif Dosya Durumu</h3>
          <div className="file-status-list">
            <div className="file-status-item">
              <span className="file-status-label">Seçilen</span>
              <span className="file-status-value">{selected.size} Uygulama</span>
            </div>
            <div className="file-status-item">
              <span className="file-status-label">Toplam Boyut</span>
              <span className="file-status-value">
                {installers.filter(i => selected.has(i.path)).reduce((acc, curr) => acc + curr.size_bytes, 0) > 0
                  ? (installers.filter(i => selected.has(i.path)).reduce((acc, curr) => acc + curr.size_bytes, 0) / (1024 * 1024)).toFixed(1) + " MB"
                  : "0 MB"}
              </span>
            </div>
          </div>

          <div className="cc-actions-grid">
            <button 
              className="cc-action-btn secondary" 
              onClick={selectAll}
              disabled={installing}
            >
              Tümünü Seç
            </button>
            <button 
              className="cc-action-btn secondary" 
              onClick={clearSelection}
              disabled={installing || selected.size === 0}
            >
              Temizle
            </button>
          </div>

          <button 
            className={`cc-main-install-btn ${selected.size > 0 ? 'active' : ''}`}
            onClick={startInstall}
            disabled={installing || selected.size === 0}
          >
            {installing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="spinner-xs" />
                <span>Kuruluyor...</span>
              </div>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                <span>{selected.size > 0 ? `Seçilenleri Kur (${selected.size})` : 'Uygulama Seçin'}</span>
              </>
            )}
          </button>
        </div>

        <div className="cc-section">
          <h3 className="cc-section-title">Performans</h3>
          <div className="telemetry-grid">
            <div className="telemetry-card">
              <div className="tel-header">
                <div className="tel-label-group">
                  <TelemetryIcon type="cpu" />
                  <span className="tel-label">İşlemci (CPU)</span>
                </div>
                <span className="tel-value">{Math.round(systemInfo.cpu_usage)}%</span>
              </div>
              <div className="tel-progress">
                <div className="tel-fill" style={{ width: `${systemInfo.cpu_usage}%` }} />
              </div>
            </div>
            <div className="telemetry-card">
              <div className="tel-header">
                <div className="tel-label-group">
                  <TelemetryIcon type="ram" />
                  <span className="tel-label">Bellek (RAM)</span>
                </div>
                <span className="tel-value">{Math.round((systemInfo.used_memory / systemInfo.total_memory) * 100)}%</span>
              </div>
              <div className="tel-progress">
                <div className="tel-fill" style={{ width: `${(systemInfo.used_memory / systemInfo.total_memory) * 100}%` }} />
              </div>
            </div>
            {systemInfo.disks && systemInfo.disks.map((disk, idx) => {
              const used = disk.total_space - disk.available_space;
              const pct = Math.round((used / disk.total_space) * 100);
              return (
                <div
                  className="telemetry-card clickable"
                  key={idx}
                  onClick={() => {
                    safeInvoke("open_drive", { path: disk.mount_point });
                    sounds.playClick();
                  }}
                  title={`${disk.mount_point} Klasörünü Aç`}
                >
                  <div className="tel-header">
                    <div className="tel-label-group">
                      <TelemetryIcon type="disk" />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="tel-label">{disk.name || disk.mount_point}</span>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{disk.model} ({disk.bus_type})</span>
                      </div>
                    </div>
                    <span className="tel-value">{pct}%</span>
                  </div>
                  <div className="tel-progress">
                    <div className="tel-fill" style={{ width: `${pct}%`, background: pct > 90 ? '#ff4757' : 'var(--accent-primary)' }} />
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                    {Math.round(used / (1024 * 1024 * 1024))} GB / {Math.round(disk.total_space / (1024 * 1024 * 1024))} GB
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cc-section">
          <h3 className="cc-section-title">Ağ Trafiği</h3>
          <div className="net-monitor">
            <div className="net-stat download">
              <div className="net-stat-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>İndirme</span>
              </div>
              <span>{formatSpeed(systemInfo.net_in)}</span>
              <div className="net-activity"><div className="net-activity-bar" style={{ width: `${Math.min(100, systemInfo.net_in / 10)}%` }}></div></div>
            </div>
            <div className="net-stat upload">
              <div className="net-stat-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <span>Yükleme</span>
              </div>
              <span>{formatSpeed(systemInfo.net_out)}</span>
              <div className="net-activity"><div className="net-activity-bar" style={{ width: `${Math.min(100, systemInfo.net_out / 10)}%` }}></div></div>
            </div>
          </div>
        </div>

        <div className="cc-section">
          <h3 className="cc-section-title">Sistem Özellikleri</h3>
          <div className="specs-list">
            <div className="spec-item os-section">
              <div className="os-header">
                <span className="spec-key">İşletim Sistemi</span>
                <div className="os-statuses">
                  <span className={`status-badge ${systemInfo.uefi_boot ? 'on' : 'off'}`} title="Modern sistem önyükleme standardı.">UEFI Boot</span>
                  <span className={`status-badge ${systemInfo.secure_boot ? 'on' : 'off'}`} title="Güvenli önyükleme; sadece dijital imzalı yazılımların başlamasına izin verir.">Secure Boot</span>
                </div>
              </div>
              <span className="spec-val large" title={systemInfo.os_version}>{systemInfo.os_version}</span>
            </div>
            <div className="spec-item">
              <span className="spec-key">İşlemci Modeli</span>
              <span className="spec-val" title={systemInfo.cpu_model}>{systemInfo.cpu_model}</span>
            </div>
            <div className="spec-item">
              <span className="spec-key">Grafik Kartı (GPU)</span>
              <span className="spec-val" title={systemInfo.gpu_model}>{systemInfo.gpu_model}</span>
            </div>
            <div className="spec-item">
              <span className="spec-key">Anakart</span>
              <span className="spec-val" title={systemInfo.motherboard}>{systemInfo.motherboard}</span>
            </div>
            <div className="spec-item">
              <span className="spec-key">BIOS</span>
              <span className="spec-val" title={systemInfo.bios_info}>{systemInfo.bios_info}</span>
            </div>
            <div className="spec-item">
              <span className="spec-key">Toplam Bellek</span>
              <span className="spec-val">{Math.round(systemInfo.total_memory / (1024 * 1024 * 1024))} GB</span>
            </div>
            <div className="spec-item">
              <span className="spec-key">Yerel IP</span>
              <span className="spec-val">{systemInfo.local_ip}</span>
            </div>
            <div className="spec-item" style={{ position: 'relative' }}>
              <span className="spec-key">DNS Sunucuları</span>
              <span
                className="spec-val"
                style={{ fontSize: '10px', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                title={systemInfo.dns_servers}
                onClick={(e) => { e.stopPropagation(); setDnsOpen(!dnsOpen); }}
              >
                {(() => {
                  const activeDns = POPULAR_DNS.find(d => systemInfo.dns_servers.includes(d.ips[0]));
                  return activeDns && (
                    <img
                      src={SPECIAL_LOGOS[activeDns.slug] || `https://cdn.simpleicons.org/${activeDns.slug}`}
                      alt={activeDns.name}
                      style={{ width: '12px', height: '12px', filter: 'drop-shadow(0 0 5px var(--accent-glow))' }}
                    />
                  );
                })()}
                {systemInfo.dns_servers}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.5, transform: dnsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="m6 9 6 6 6-6" /></svg>
              </span>

              {dnsOpen && (
                <div className="dns-quick-list" onClick={(e) => e.stopPropagation()}>
                  <div className="dns-quick-header">
                    <span>DNS Değiştirici</span>
                    <button onClick={() => setDnsOpen(false)}>&times;</button>
                  </div>
                  {POPULAR_DNS.map(dns => (
                    <div
                      key={dns.name}
                      className="dns-quick-item"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          addLog(`${dns.name} DNS uygulanıyor...`, "process");
                          await safeInvoke("set_dns", { dns: dns.ips });
                          addLog(`${dns.name} DNS başarıyla ayarlandı.`, "success");
                          sounds.playSuccess();
                          setSystemInfo(prev => prev ? { ...prev, dns_servers: dns.ips.join(", ") } : prev);
                          setDnsOpen(false);
                        } catch (err) {
                          addLog(`DNS Hatası: ${err}`, "error");
                          sounds.playError();
                        }
                      }}
                    >
                      <div className="dns-q-header-row">
                        <img src={SPECIAL_LOGOS[dns.slug] || `https://cdn.simpleicons.org/${dns.slug}`} alt={dns.name} className="dns-q-icon" />
                        <span className="dns-q-name">{dns.name}</span>
                      </div>
                      <span className="dns-q-ips">{dns.ips[0]}</span>
                    </div>
                  ))}
                  <div
                    className="dns-quick-item reset"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        addLog("DNS ayarları sıfırlanıyor...", "process");
                        await safeInvoke("reset_dns");
                        addLog("DNS ayarları otomatiğe döndürüldü.", "success");
                        sounds.playSuccess();
                        setTimeout(async () => {
                          const info = await safeInvoke("get_system_info");
                          setSystemInfo(info);
                        }, 500);
                        setDnsOpen(false);
                      } catch (err) {
                        addLog(`DNS Hatası: ${err}`, "error");
                      }
                    }}
                  >
                    Otomatik DNS'e Dön
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ControlCenter;
