'use client';

/**
 * Composant pour gérer les paramètres d'auto-lock
 */

import { useSecuritySettings } from '../hooks/useSecuritySettings';
import '../styles/SecuritySettings.css';

export default function SecurityAutoLockSettings() {
  const {
    settings,
    toggleAutoLock,
    setAutoLockTimeout,
  } = useSecuritySettings();

  const handleTimeoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const minutes = parseInt(e.target.value);
    setAutoLockTimeout(minutes);
  };

  return (
    <div className="security-settings-section">
      <h3>🔒 Verrouillage Automatique</h3>
      
      <div className="security-setting-item">
        <label className="security-toggle-label">
          <input
            type="checkbox"
            checked={settings.autoLockEnabled}
            onChange={(e) => toggleAutoLock(e.target.checked)}
          />
          <span>Activer le verrouillage automatique</span>
        </label>
        <p className="security-setting-description">
          Le coffre se verrouillera automatiquement après une période d&apos;inactivité
        </p>
      </div>

      {settings.autoLockEnabled && (
        <div className="security-setting-item">
          <label htmlFor="autoLockTimeout">
            Délai d&apos;inactivité
          </label>
          <select
            id="autoLockTimeout"
            value={settings.autoLockTimeout}
            onChange={handleTimeoutChange}
            className="security-select"
          >
            <option value={1}>1 minute</option>
            <option value={2}>2 minutes</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 heure</option>
          </select>
          <p className="security-setting-description">
            Le coffre se verrouillera après {settings.autoLockTimeout} minute{settings.autoLockTimeout > 1 ? 's' : ''} d&apos;inactivité
          </p>
        </div>
      )}

      <div className="security-info-box">
        <p>
          <strong>ℹ️ Conseil :</strong> Un délai plus court améliore la sécurité,
          mais peut nécessiter plus de déverrouillages fréquents.
        </p>
      </div>
    </div>
  );
}
