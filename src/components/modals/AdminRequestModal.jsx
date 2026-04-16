import React from 'react';

const AdminRequestModal = ({ show, onConfirm, onCancel, appName, actionType = "Kaldırma" }) => {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content admin-request-modal-premium" onClick={e => e.stopPropagation()}>
        <div className="modal-glow-effect-admin" />
        
        <div className="modal-header-premium">
          <div className="header-badge admin-badge">GÜVENLİK ONAYI</div>
          <button className="close-btn-premium" onClick={onCancel}>&times;</button>
        </div>

        <div className="modal-body admin-body-premium">
          <div className="admin-status-icon">
            <div className="shield-icon-container">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shield-svg">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <div className="pulse-ring" />
            </div>
          </div>

          <div className="admin-text-content">
            <h3>Yönetici İzni Gerekli</h3>
            <p className="admin-app-name">{appName}</p>
            <div className="admin-divider" />
            <p className="admin-desc">
              Bu uygulamanın <strong>{actionType}</strong> işlemi, sistem dosyalarında değişiklik yapmayı gerektirir. 
              Devam ettiğinizde karşınıza çıkacak olan Windows onay kutusuna (UAC) <strong>"Evet"</strong> demeniz gerekmektedir.
            </p>
          </div>

          <div className="admin-info-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <span>StashZero, güvenliğiniz için sadece gerekli işlemlerde yetki talep eder.</span>
          </div>

          <div className="admin-actions-premium">
            <button className="admin-btn-cancel" onClick={onCancel}>Vazgeç</button>
            <button className="admin-btn-confirm" onClick={onConfirm}>
              Devam Et
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRequestModal;
