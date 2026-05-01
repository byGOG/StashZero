import { useState, useEffect } from "react";
import { getJSON, setJSON, SettingKeys } from "../../utils/settings";
import { sounds } from "../../utils/audio";

const ProfilesModal = ({
  isOpen,
  onClose,
  selected,
  setSelected,
  installers,
  installedApps,
  exportSelection,
  importSelection,
  addLog,
  t
}) => {
  const [profiles, setProfiles] = useState({});
  const [newProfileName, setNewProfileName] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null); // Name of the profile being renamed
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setProfiles(getJSON(SettingKeys.profiles, {}));
      setNewProfileName("");
    }
  }, [isOpen]);

  const saveProfile = () => {
    if (!newProfileName.trim()) return;
    if (selected.size === 0) {
      addLog("Kayıt için en az bir uygulama seçmelisiniz.", "error");
      sounds.playError();
      return;
    }

    const newProfiles = {
      ...profiles,
      [newProfileName.trim()]: Array.from(selected)
    };
    
    setProfiles(newProfiles);
    setJSON(SettingKeys.profiles, newProfiles);
    setNewProfileName("");
    addLog(`"${newProfileName}" profili kaydedildi.`, "success");
    sounds.playSuccess();
  };

  const loadProfile = (name) => {
    const profilePaths = profiles[name] || [];
    const validPaths = profilePaths.filter(p => {
      const app = installers.find(i => i.path === p);
      return app && !(installedApps[app.id] && !app.script_cmd && !app.is_resource);
    });
    
    setSelected(new Set(validPaths));
    addLog(`"${name}" profili yüklendi. (${validPaths.length} uygulama)`, "success");
    sounds.playSuccess();
    onClose();
  };

  const deleteProfile = (name) => {
    const newProfiles = { ...profiles };
    delete newProfiles[name];
    setProfiles(newProfiles);
    setJSON(SettingKeys.profiles, newProfiles);
    addLog(`"${name}" profili silindi.`, "info");
    sounds.playClick();
  };

  const importFromUrl = async () => {
    if (!importUrl.trim()) return;
    setIsFetching(true);
    addLog("Profil URL'den indiriliyor...", "process");
    
    try {
      const response = await fetch(importUrl);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const list = await response.json();
      if (Array.isArray(list)) {
        const validPaths = list.filter(p => {
          const app = installers.find(i => i.path === p);
          return app && !(installedApps[app.id] && !app.script_cmd && !app.is_resource);
        });
        setSelected(new Set(validPaths));
        addLog(`URL üzerinden ${validPaths.length} uygulama başarıyla yüklendi.`, "success");
        sounds.playSuccess();
        setImportUrl("");
        onClose();
      } else {
        throw new Error("Geçersiz profil formatı (JSON dizisi bekleniyor)");
      }
    } catch (e) {
      addLog(`İndirme hatası: ${e.message}`, "error");
      sounds.playError();
    } finally {
      setIsFetching(false);
    }
  };

  const renameProfile = (oldName) => {
    if (!renameValue.trim() || renameValue === oldName) {
      setEditingProfile(null);
      return;
    }
    const newProfiles = { ...profiles };
    newProfiles[renameValue.trim()] = newProfiles[oldName];
    delete newProfiles[oldName];
    setProfiles(newProfiles);
    setJSON(SettingKeys.profiles, newProfiles);
    setEditingProfile(null);
    addLog(`Profil adı "${renameValue}" olarak güncellendi.`, "success");
    sounds.playClick();
  };

  const updateProfileContent = (name) => {
    if (selected.size === 0) {
      addLog("Profil içeriğini güncellemek için en az bir uygulama seçili olmalı.", "error");
      return;
    }
    const newProfiles = {
      ...profiles,
      [name]: Array.from(selected)
    };
    setProfiles(newProfiles);
    setJSON(SettingKeys.profiles, newProfiles);
    addLog(`"${name}" profil içeriği mevcut seçimle güncellendi.`, "success");
    sounds.playSuccess();
  };

  const copyProfileToClipboard = async (name) => {
    try {
      const content = JSON.stringify(profiles[name], null, 2);
      await navigator.clipboard.writeText(content);
      addLog(`"${name}" profil verisi panoya kopyalandı! Artık paylaşabilirsiniz.`, "success");
      sounds.playSuccess();
    } catch (e) {
      addLog(`Kopyalama hatası: ${e.message}`, "error");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content profiles-modal">
        <div className="modal-header">
          <div className="modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <h2>Kullanıcı Profilleri</h2>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="profiles-top-actions">
            <div className="save-profile-group">
              <input 
                type="text" 
                placeholder="Yeni Profil Adı..." 
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveProfile()}
              />
              <button className="btn-primary" onClick={saveProfile} disabled={selected.size === 0}>
                Kaydet ({selected.size})
              </button>
            </div>
            <div className="external-actions">
              <div className="url-import-group">
                <input 
                  type="text" 
                  placeholder="Profil URL (JSON)..." 
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && importFromUrl()}
                />
                <button className="btn-url-import" onClick={importFromUrl} disabled={isFetching || !importUrl.trim()}>
                  {isFetching ? <div className="spinner-xs" /> : "URL İçe Aktar"}
                </button>
              </div>
              <div className="file-actions-row">
                <button className="btn-secondary" onClick={() => { importSelection(); onClose(); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Dosya İçe Aktar
                </button>
                <button className="btn-secondary" onClick={() => { exportSelection(); onClose(); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  Dışa Aktar
                </button>
              </div>
            </div>
          </div>

          <div className="profiles-list">
            {Object.keys(profiles).length === 0 ? (
              <div className="empty-state">Henüz kayıtlı bir profil yok.</div>
            ) : (
              Object.entries(profiles).map(([name, paths]) => (
                <div key={name} className="profile-item">
                  <div className="profile-info">
                    {editingProfile === name ? (
                      <div className="rename-group">
                        <input 
                          type="text" 
                          value={renameValue} 
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && renameProfile(name)}
                          autoFocus
                        />
                        <button className="btn-save-rename" onClick={() => renameProfile(name)}>💾</button>
                        <button className="btn-cancel-rename" onClick={() => setEditingProfile(null)}>✕</button>
                      </div>
                    ) : (
                      <>
                        <div className="profile-name-row">
                          <span className="profile-name">{name}</span>
                          <button 
                            className="btn-icon-edit" 
                            onClick={() => { setEditingProfile(name); setRenameValue(name); }}
                            title="Yeniden Adlandır"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                        </div>
                        <span className="profile-count">{paths.length} Uygulama</span>
                      </>
                    )}
                  </div>
                  <div className="profile-actions">
                    <button className="btn-icon-copy" onClick={() => copyProfileToClipboard(name)} title="Profil JSON'unu kopyala">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <button className="btn-update-content" onClick={() => updateProfileContent(name)} title="Mevcut seçimi bu profile kaydet">Güncelle</button>
                    <button className="btn-load" onClick={() => loadProfile(name)}>Yükle</button>
                    <button className="btn-delete" onClick={() => deleteProfile(name)}>Sil</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilesModal;
