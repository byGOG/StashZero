import { memo } from "react";
import { safeInvoke } from "../../utils/tauri";
import TelemetryIcon from "../icons/TelemetryIcon";
import { POPULAR_DNS, SPECIAL_LOGOS } from "../../data/library";
import { sounds } from "../../utils/audio";
import { motion } from 'framer-motion';
import './SecurityCenter.css';

const PerformanceSection = memo(function PerformanceSection({ cpu_usage, used_memory, total_memory }) {
  const ramPct = (used_memory / total_memory) * 100;
  return (
    <div className="cc-section">
      <h3 className="cc-section-title">Performans</h3>
      <div className="telemetry-grid">
        <div className="telemetry-card">
          <div className="tel-header">
            <div className="tel-label-group">
              <TelemetryIcon type="cpu" />
              <span className="tel-label">İşlemci (CPU)</span>
            </div>
            <span className="tel-value">{Math.round(cpu_usage)}%</span>
          </div>
          <div className="tel-progress">
            <div className="tel-fill" style={{ width: `${cpu_usage}%` }} />
          </div>
        </div>
        <div className="telemetry-card">
          <div className="tel-header">
            <div className="tel-label-group">
              <TelemetryIcon type="ram" />
              <span className="tel-label">Bellek (RAM)</span>
            </div>
            <span className="tel-value">{Math.round(ramPct)}%</span>
          </div>
          <div className="tel-progress">
            <div className="tel-fill" style={{ width: `${ramPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
});

const SecurityGrid = memo(function SecurityGrid({ is_windows_dark, defender_active, uac_level, addLog }) {
  return (
    <div className="cc-section">
      <h3 className="cc-section-title">Hızlı Denetim</h3>
      <div className="cc-unified-grid">
        <motion.div
          className="security-card modern-glass-v2 unified"
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { safeInvoke("open_desktop_icon_settings"); sounds.playClick(); }}
        >
          <div className="glass-card-glow" />
          <div className="security-card-content vertical-unified">
            <div className="security-icon-wrapper settings-accent small-unified">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            </div>
            <div className="security-meta centered-unified">
              <span className="security-label">Masaüstü</span>
              <span className="security-status-text">Düzen Ayarları</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="security-card modern-glass-v2 unified"
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { safeInvoke("open_power_settings"); sounds.playClick(); }}
        >
          <div className="glass-card-glow" />
          <div className="security-card-content vertical-unified">
            <div className="security-icon-wrapper power-accent small-unified">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
            </div>
            <div className="security-meta centered-unified">
              <span className="security-label">Güç</span>
              <span className="security-status-text">Plan Yönetimi</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="security-card modern-glass-v2 unified"
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            safeInvoke("set_windows_theme", { dark: !is_windows_dark });
            sounds.playClick();
            addLog(`Windows ${!is_windows_dark ? 'Koyu' : 'Açık'} Mod talep edildi.`, "info");
          }}
        >
          <div className="glass-card-glow" />
          <div className="security-card-content vertical-unified">
            <div className={`security-icon-wrapper small-unified ${is_windows_dark ? 'dark-mode-accent' : 'light-mode-accent'}`}>
              {is_windows_dark ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              )}
            </div>
            <div className="security-meta centered-unified">
              <span className="security-label">Görünüm</span>
              <span className="security-status-text">{is_windows_dark ? 'Koyu Mod' : 'Açık Mod'}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className={`security-card modern-glass-v2 unified ${defender_active ? 'safe' : 'danger'}`}
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => safeInvoke("open_defender_settings")}
        >
          <div className="glass-card-glow" />
          <div className="security-card-content vertical-unified">
            <div className="security-icon-wrapper small-unified">
              <TelemetryIcon type="shield" />
            </div>
            <div className="security-meta centered-unified">
              <span className="security-label">Güvenlik</span>
              <span className="security-status-text">{defender_active ? 'Koruma Aktif' : 'Risk Altında'}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div
        className="uac-floating-bar large-version"
        onClick={() => { safeInvoke("open_uac_settings"); sounds.playClick(); }}
        title="Windows UAC Ayarlarını açmak için tıkla"
      >
        <div className="uac-f-content">
          <div className="uac-f-icon-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <div className="uac-f-text-group">
            <span className="uac-f-main-label">UAC Denetimi</span>
            <span className="uac-f-sub-label">Seviye {uac_level}</span>
          </div>
        </div>
        <div className="uac-f-dots-container">
          {[0, 1, 2, 3].map(lvl => (
            <div
              key={lvl}
              className={`uac-f-dot-large ${lvl <= uac_level ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                safeInvoke("set_uac_level", { level: lvl });
                sounds.playClick();
                addLog(`UAC Seviyesi ${lvl} olarak talep edildi.`, "info");
              }}
              title={`UAC Seviyesini ${lvl} yapmak için tıkla`}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

const DisksGrid = memo(function DisksGrid({ disks }) {
  if (!disks) return null;
  return (
    <div className="cc-section">
      <h3 className="cc-section-title">Diskler</h3>
      <div className="telemetry-grid">
        {disks.map((disk, idx) => {
          const used = disk.total_space - disk.available_space;
          const pct = Math.round((used / disk.total_space) * 100);
          return (
            <div
              className="telemetry-card clickable"
              key={idx}
              onClick={() => { safeInvoke("open_drive", { path: disk.mount_point }); sounds.playClick(); }}
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
  );
});

const SpecsList = memo(function SpecsList({
  os_version, cpu_model, gpu_model, motherboard, bios_info,
  total_memory, local_ip, dns_servers, uefi_boot, secure_boot,
  dnsOpen, setDnsOpen, setSystemInfo, addLog
}) {
  const activeDns = POPULAR_DNS.find(d => dns_servers && dns_servers.includes(d.ips[0]));
  return (
    <div className="cc-section">
      <h3 className="cc-section-title">Sistem Özellikleri</h3>
      <div className="specs-list">
        <div className="spec-item os-section">
          <div className="os-header">
            <span className="spec-key">İşletim Sistemi</span>
            <div className="os-statuses">
              <span className={`status-badge ${uefi_boot ? 'on' : 'off'}`} title="Modern sistem önyükleme standardı.">UEFI Boot</span>
              <span className={`status-badge ${secure_boot ? 'on' : 'off'}`} title="Güvenli önyükleme; sadece dijital imzalı yazılımların başlamasına izin verir.">Secure Boot</span>
            </div>
          </div>
          <span className="spec-val large" title={os_version}>{os_version}</span>
        </div>
        <div className="spec-item">
          <span className="spec-key">İşlemci Modeli</span>
          <span className="spec-val" title={cpu_model}>{cpu_model}</span>
        </div>
        <div className="spec-item">
          <span className="spec-key">Grafik Kartı (GPU)</span>
          <span className="spec-val" title={gpu_model}>{gpu_model}</span>
        </div>
        <div className="spec-item">
          <span className="spec-key">Anakart</span>
          <span className="spec-val" title={motherboard}>{motherboard}</span>
        </div>
        <div className="spec-item">
          <span className="spec-key">BIOS</span>
          <span className="spec-val" title={bios_info}>{bios_info}</span>
        </div>
        <div className="spec-item">
          <span className="spec-key">Toplam Bellek</span>
          <span className="spec-val">{Math.round(total_memory / (1024 * 1024 * 1024))} GB</span>
        </div>
        <div className="spec-item">
          <span className="spec-key">Yerel IP</span>
          <span className="spec-val">{local_ip}</span>
        </div>
        <div className="spec-item" style={{ position: 'relative' }}>
          <span className="spec-key">DNS Sunucuları</span>
          <span
            className="spec-val"
            style={{ fontSize: '10px', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            title={dns_servers}
            onClick={(e) => { e.stopPropagation(); setDnsOpen(!dnsOpen); }}
          >
            {activeDns && (
              <img
                src={SPECIAL_LOGOS[activeDns.slug] || `https://cdn.simpleicons.org/${activeDns.slug}`}
                alt={activeDns.name}
                style={{ width: '12px', height: '12px', filter: 'drop-shadow(0 0 5px var(--accent-glow))' }}
              />
            )}
            {dns_servers}
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
                      const info = await safeInvoke("get_slow_telemetry");
                      if (info) setSystemInfo(prev => prev ? { ...prev, ...info } : prev);
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
  );
});

const ControlCenter = ({
  systemInfo,
  dnsOpen,
  setDnsOpen,
  addLog,
  setSystemInfo,
}) => {
  return (
    <aside className="control-center">
      <div className="cc-header">
        <h2>Kontrol Merkezi</h2>
      </div>

      <div className="cc-content">
        {!systemInfo ? (
          <div className="cc-section">
            <h3 className="cc-section-title">Sistem Telemetrisi</h3>
            <div className="spinner-container" style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <div className="spinner" />
            </div>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>Sistem verileri taranıyor...</p>
          </div>
        ) : (
          <>
            <PerformanceSection
              cpu_usage={systemInfo.cpu_usage}
              used_memory={systemInfo.used_memory}
              total_memory={systemInfo.total_memory}
            />
            <SecurityGrid
              is_windows_dark={systemInfo.is_windows_dark}
              defender_active={systemInfo.defender_active}
              uac_level={systemInfo.uac_level}
              addLog={addLog}
            />
            <DisksGrid disks={systemInfo.disks} />
            <SpecsList
              os_version={systemInfo.os_version}
              cpu_model={systemInfo.cpu_model}
              gpu_model={systemInfo.gpu_model}
              motherboard={systemInfo.motherboard}
              bios_info={systemInfo.bios_info}
              total_memory={systemInfo.total_memory}
              local_ip={systemInfo.local_ip}
              dns_servers={systemInfo.dns_servers}
              uefi_boot={systemInfo.uefi_boot}
              secure_boot={systemInfo.secure_boot}
              dnsOpen={dnsOpen}
              setDnsOpen={setDnsOpen}
              setSystemInfo={setSystemInfo}
              addLog={addLog}
            />
          </>
        )}
      </div>
    </aside>
  );
};

export default ControlCenter;
