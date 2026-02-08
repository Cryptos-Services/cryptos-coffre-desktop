'use client';

/**
 * Composant pour gérer les credentials WebAuthn 2FA
 */

import { useState, useEffect } from 'react';
import { useSecuritySettings } from '../hooks/useSecuritySettings';
import {
  isWebAuthnAvailable,
  isPlatformAuthenticatorAvailable,
  registerWebAuthnCredential,
  removeWebAuthnCredential,
  renameWebAuthnCredential,
} from '../lib/webauthn';
import { formatAuthenticatorName } from '../lib/aaguids';
import { addAuditLog } from '../lib/auditLog';
import type { WebAuthnCredential } from '../types/security';
import '../styles/SecuritySettings.css';

export default function WebAuthnManager() {
  const { settings, saveSettings } = useSecuritySettings();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    setIsAvailable(isWebAuthnAvailable());
    if (isWebAuthnAvailable()) {
      const platformAvailable = await isPlatformAuthenticatorAvailable();
      setIsPlatformAvailable(platformAvailable);
    }
  };

  const handleRegisterPlatform = async () => {
    setLoading(true);
    setError(null);

    try {
      const userId = `vault-user-${Date.now()}`;
      const userName = 'Vault User';
      
      const credential = await registerWebAuthnCredential(userId, userName, 'platform');
      
      console.log('🔑 Enregistrement credential platform:', credential);
      console.log('💾 Credentials actuels avant sauvegarde:', settings.webAuthnCredentials);
      
      const newCredentials = [...(settings.webAuthnCredentials || []), credential];
      
      console.log('💾 Nouveaux credentials après ajout:', newCredentials);
      
      saveSettings({ 
        webAuthnCredentials: newCredentials,
        webAuthnEnabled: true, // Auto-active la 2FA lors du 1er enregistrement
      });
      
      // Vérifie que la sauvegarde a fonctionné
      setTimeout(() => {
        const stored = localStorage.getItem('vault-security-settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('✅ Vérification localStorage - Credentials sauvegardés:', parsed.webAuthnCredentials);
        }
      }, 100);

      addAuditLog('2fa_enabled', {
        success: true,
      });

      alert('✅ Authentification biométrique enregistrée avec succès !');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Erreur inconnue');
      addAuditLog('2fa_enabled', {
        success: false,
        errorMessage: error.message || 'Erreur inconnue',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCrossPlatform = async () => {
    setLoading(true);
    setError(null);

    try {
      const userId = `vault-user-${Date.now()}`;
      const userName = 'Vault User';
      
      const credential = await registerWebAuthnCredential(userId, userName, 'cross-platform');
      
      console.log('🔑 Enregistrement credential cross-platform:', credential);
      console.log('💾 Credentials actuels avant sauvegarde:', settings.webAuthnCredentials);
      
      const newCredentials = [...(settings.webAuthnCredentials || []), credential];
      
      console.log('💾 Nouveaux credentials après ajout:', newCredentials);
      
      saveSettings({ 
        webAuthnCredentials: newCredentials,
        webAuthnEnabled: true, // Auto-active la 2FA lors du 1er enregistrement
      });
      
      // Vérifie que la sauvegarde a fonctionné
      setTimeout(() => {
        const stored = localStorage.getItem('vault-security-settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('✅ Vérification localStorage - Credentials sauvegardés:', parsed.webAuthnCredentials);
        }
      }, 100);

      addAuditLog('2fa_enabled', {
        success: true,
      });

      alert('✅ Clé de sécurité enregistrée avec succès !');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Erreur inconnue');
      addAuditLog('2fa_enabled', {
        success: false,
        errorMessage: error.message || 'Erreur inconnue',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCredential = (credentialId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce credential ?')) return;

    const newCredentials = removeWebAuthnCredential(
      settings.webAuthnCredentials || [],
      credentialId
    );

    saveSettings({ 
      webAuthnCredentials: newCredentials,
      webAuthnEnabled: newCredentials.length > 0,
    });

    addAuditLog('2fa_disabled', {
      success: true,
    });

    alert('✅ Credential supprimé');
  };

  const handleStartEdit = (credentialId: string, currentName: string) => {
    setEditingId(credentialId);
    setEditName(currentName);
  };

  const handleSaveEdit = (credentialId: string) => {
    if (!editName.trim()) {
      alert('Le nom ne peut pas être vide');
      return;
    }

    const newCredentials = renameWebAuthnCredential(
      settings.webAuthnCredentials || [],
      credentialId,
      editName
    );

    saveSettings({ webAuthnCredentials: newCredentials });
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleToggleEnabled = (credentialId: string) => {
    const credential = settings.webAuthnCredentials?.find(c => c.id === credentialId);
    if (!credential) return;

    console.log('🔄 Toggle credential:', { name: credential.name, currentEnabled: credential.enabled });

    const newEnabled = credential.enabled === false ? true : false;
    
    console.log('🔄 Nouvel état enabled:', newEnabled);
    
    const newCredentials = (settings.webAuthnCredentials || []).map(cred =>
      cred.id === credentialId
        ? { ...cred, enabled: newEnabled }
        : cred
    );

    console.log('🔄 Credentials après toggle:', newCredentials.map(c => ({ name: c.name, enabled: c.enabled })));

    // Vérifie qu'au moins un credential reste actif
    const hasActiveCredentials = newCredentials.some(c => c.enabled !== false);
    
    console.log('🔄 Au moins un credential actif?', hasActiveCredentials);
    
    if (!hasActiveCredentials && !newEnabled) {
      alert('⚠️ Impossible de désactiver: Au moins un credential doit rester actif pour l\'authentification.');
      return;
    }

    saveSettings({ webAuthnCredentials: newCredentials });

    addAuditLog('2fa_credential_toggled', {
      success: true,
      credentialName: credential.name,
      enabled: newEnabled,
    });
  };

  const handleToggle2FA = (enabled: boolean) => {
    if (!enabled && (settings.webAuthnCredentials || []).length > 0) {
      if (!confirm('Désactiver la 2FA ? Vous devrez reconfigurer vos credentials.')) {
        return;
      }
    }

    saveSettings({ webAuthnEnabled: enabled });
    
    if (!enabled) {
      addAuditLog('2fa_disabled', { success: true });
    }
  };

  if (!isAvailable) {
    return (
      <div className="security-settings-section">
        <h3>🔐 Authentification à Deux Facteurs (2FA)</h3>
        <div className="security-info-box security-info-box-error">
          <p>
            <strong>⚠️ Non disponible:</strong> Votre navigateur ne supporte pas WebAuthn.
            Utilisez Chrome, Firefox, Safari ou Edge récent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="security-settings-section">
      <h3>🔐 Authentification à Deux Facteurs (2FA)</h3>

      <div className="security-setting-item">
        <label className="security-toggle-label">
          <input
            type="checkbox"
            checked={settings.webAuthnEnabled}
            onChange={(e) => handleToggle2FA(e.target.checked)}
          />
          <span>Activer l&apos;authentification 2FA</span>
        </label>
        <p className="security-setting-description">
          Ajoute une couche de sécurité supplémentaire avec biométrie ou clé de sécurité
        </p>
      </div>

      {error && (
        <div className="security-info-box security-info-box-error-bg">
          <p><strong>❌ Erreur:</strong> {error}</p>
        </div>
      )}

      {settings.webAuthnEnabled && (
        <>
          <div className="security-setting-item">
            <h4 className="webauthn-credential-header">
              Credentials enregistrés ({(settings.webAuthnCredentials || []).length})
            </h4>

            {(settings.webAuthnCredentials || []).length === 0 ? (
              <p className="security-setting-description">
                Aucun credential enregistré. Ajoutez-en un ci-dessous.
              </p>
            ) : (
              <div className="webauthn-credentials-container">
                {settings.webAuthnCredentials!.map((cred) => (
                  <div
                    key={cred.id}
                    className={`webauthn-credential-item ${cred.enabled === false ? 'webauthn-credential-disabled' : ''}`}
                  >
                    <div className="webauthn-credential-content">
                      {editingId === cred.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="security-select webauthn-credential-input"
                          autoFocus
                          placeholder="Nom du credential"
                          aria-label="Nom du credential"
                        />
                      ) : (
                        <strong>{cred.name}</strong>
                      )}
                      <div className="webauthn-credential-info">
                        {cred.aaguid ? (
                          <>
                            Modèle: {formatAuthenticatorName(cred.aaguid, cred.authenticatorType)}
                            <br />
                          </>
                        ) : (
                          <>
                            Type: {cred.authenticatorType === 'platform' ? '📱 Biométrie' : '🔑 Clé externe'}
                            <br />
                          </>
                        )}
                        Dernière utilisation: {new Date(cred.lastUsed).toLocaleString('fr-FR')}
                        <br />
                        <div className="webauthn-credential-status">
                          <label className="webauthn-toggle-label">
                            <input
                              type="checkbox"
                              checked={cred.enabled !== false}
                              onChange={() => handleToggleEnabled(cred.id)}
                              className="webauthn-toggle-input"
                              title='Uiliser cette clé pour la 2FA'
                              aria-label={cred.enabled !== false ? 'Credential activé' : 'Credential désactivé'}
                            />
                            <span className="webauthn-toggle-slider"></span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="webauthn-credential-buttons">
                      {editingId === cred.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(cred.id)}
                            className="vault-btn vault-btn-primary webauthn-button-small"
                          >
                            ✅ Sauver
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="vault-btn vault-btn-secondary webauthn-button-small"
                          >
                            ❌ Annuler
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(cred.id, cred.name)}
                            className="vault-btn vault-btn-secondary webauthn-button-small"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleRemoveCredential(cred.id)}
                            className="vault-btn vault-btn-danger webauthn-button-small"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="security-setting-item">
            <h4 className="webauthn-credential-header">Ajouter un credential</h4>
            
            <div className="webauthn-add-buttons">
              {isPlatformAvailable && (
                <button
                  onClick={handleRegisterPlatform}
                  disabled={loading}
                  className="vault-btn vault-btn-primary webauthn-button-flex"
                >
                  {loading ? '⏳ Enregistrement...' : '📱 Biométrie (Touch/Face ID)'}
                </button>
              )}
              
              <button
                onClick={handleRegisterCrossPlatform}
                disabled={loading}
                className="vault-btn vault-btn-primary webauthn-button-flex"
              >
                {loading ? '⏳ Enregistrement...' : '🔑 Clé de sécurité (YubiKey)'}
              </button>
            </div>
          </div>

          <div className="security-info-box">
            <p>
              <strong>ℹ️ À propos de la 2FA:</strong>
            </p>
            <ul className="webauthn-info-list">
              <li>La biométrie utilise Touch ID, Face ID ou Windows Hello</li>
              <li>Les clés de sécurité incluent YubiKey, Titan, etc.</li>
              <li>Vous pouvez enregistrer plusieurs credentials</li>
              <li>Si vous perdez l&apos;accès, utilisez les codes de récupération</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
