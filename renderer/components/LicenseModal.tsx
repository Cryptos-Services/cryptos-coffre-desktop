import { useState } from 'react';
import { getLicenseInfo, activateLicense, LicenseStatus } from '../lib/licensing';
import '../styles/LicenseModal.css';

interface LicenseModalProps {
  onClose: () => void;
  onActivated: () => void;
}

export function LicenseModal({ onClose, onActivated }: LicenseModalProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const licenseInfo = getLicenseInfo();

  const handleActivate = () => {
    if (!licenseKey.trim()) {
      setError('Veuillez entrer une clé de licence');
      return;
    }

    setIsActivating(true);
    setError('');

    // Simule un petit délai (en production, ce serait une requête serveur)
    setTimeout(() => {
      const result = activateLicense(licenseKey.trim());
      
      if (result.success) {
        onActivated();
        onClose();
      } else {
        setError(result.message);
        setIsActivating(false);
      }
    }, 500);
  };

  const handlePurchase = () => {
    // Ouvre la page d'achat sur votre site
    window.electronAPI?.shell?.openExternal('https://cryptos-services.com/cryptos-coffre-desktop/achat');
  };

  const getStatusMessage = () => {
    if (licenseInfo.status === 'active') {
      return {
        emoji: '✅',
        title: 'Licence active',
        message: `Votre licence est activée et valide.`,
        color: 'success'
      };
    }

    if (licenseInfo.status === 'trial') {
      return {
        emoji: '🎁',
        title: `Période d'essai - ${licenseInfo.trialDaysRemaining} jour${licenseInfo.trialDaysRemaining > 1 ? 's' : ''} restant${licenseInfo.trialDaysRemaining > 1 ? 's' : ''}`,
        message: `Profitez de toutes les fonctionnalités gratuitement pendant encore ${licenseInfo.trialDaysRemaining} jour${licenseInfo.trialDaysRemaining > 1 ? 's' : ''}.`,
        color: 'info'
      };
    }

    return {
      emoji: '⚠️',
      title: 'Période d\'essai expirée',
      message: 'Votre période d\'essai de 15 jours est terminée. Activez une licence pour continuer à utiliser Cryptos Coffre.',
      color: 'warning'
    };
  };

  const status = getStatusMessage();
  const isExpired = licenseInfo.status === 'expired';
  const isActive = licenseInfo.status === 'active';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content license-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className={`license-status license-status-${status.color}`}>
          <span className="license-emoji">{status.emoji}</span>
          <h2>{status.title}</h2>
          <p>{status.message}</p>
        </div>

        {!isActive && (
          <>
            <div className="license-form">
              <h3>Activer une licence</h3>
              
              <div className="form-group">
                <label htmlFor="license-key">Clé de licence</label>
                <input
                  id="license-key"
                  type="text"
                  placeholder="CRYPT-XXXXX-XXXXX-XXXXX-XXXXX"
                  value={licenseKey}
                  onChange={(e) => {
                    setLicenseKey(e.target.value.toUpperCase());
                    setError('');
                  }}
                  maxLength={29}
                  disabled={isActivating}
                  autoFocus={isExpired}
                />
                <small>Format : CRYPT-XXXXX-XXXXX-XXXXX-XXXXX</small>
                {error && <div className="error-message">{error}</div>}
              </div>

              <div className="modal-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleActivate}
                  disabled={isActivating || !licenseKey.trim()}
                >
                  {isActivating ? 'Activation...' : 'Activer la licence'}
                </button>
              </div>
            </div>

            <div className="license-purchase">
              <h3>Pas encore de licence ?</h3>
              <p>
                Achetez une <strong>licence à vie</strong> et profitez de Cryptos Coffre sans limitation de temps.
              </p>
              <ul className="license-features">
                <li>✅ Toutes les fonctionnalités incluses</li>
                <li>✅ Chiffrement AES-GCM 256-bit</li>
                <li>✅ Authentification 2FA (WebAuthn + TOTP)</li>
                <li>✅ Import/Export multi-formats</li>
                <li>✅ Mises à jour gratuites à vie</li>
                <li>✅ Support technique</li>
              </ul>
              <button className="btn btn-success btn-purchase" onClick={handlePurchase}>
                🛒 Acheter une licence
              </button>
            </div>
          </>
        )}

        {isActive && (
          <div className="license-details">
            <div className="detail-row">
              <span className="detail-label">Clé de licence :</span>
              <span className="detail-value">{licenseInfo.licenseKey}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Activée le :</span>
              <span className="detail-value">
                {licenseInfo.licenseActivatedAt && new Date(licenseInfo.licenseActivatedAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
