'use client';

/**
 * Composant de réinitialisation complète du coffre-fort
 * Permet de supprimer TOUTES les données et repartir de zéro
 */

import { useState } from 'react';
import { useVault } from '../hooks/useVault';
import { useSecuritySettings } from '../hooks/useSecuritySettings';
import '../styles/SecuritySettings.css';

interface VaultResetProps {
  onClose: () => void;
}

export default function VaultReset({ onClose }: VaultResetProps) {
  const { entries } = useVault();
  const { settings } = useSecuritySettings();
  const [step, setStep] = useState<'warning' | 'export' | 'confirm' | 'processing'>('warning');
  const [confirmText, setConfirmText] = useState('');
  const [exportDone, setExportDone] = useState(false);

  /**
   * Exporte toutes les données avant réinitialisation
   */
  const handleExportBeforeReset = () => {
    try {
      // Export des entrées du coffre
      const vaultData = {
        entries,
        exportDate: new Date().toISOString(),
        exportReason: 'Backup avant réinitialisation complète',
      };

      const vaultBlob = new Blob([JSON.stringify(vaultData, null, 2)], {
        type: 'application/json',
      });
      const vaultUrl = URL.createObjectURL(vaultBlob);
      const vaultLink = document.createElement('a');
      vaultLink.href = vaultUrl;
      vaultLink.download = `vault-backup-${new Date().toISOString().split('T')[0]}.json`;
      vaultLink.click();
      URL.revokeObjectURL(vaultUrl);

      // Export des paramètres de sécurité (sans les codes de récupération sensibles)
      const securityData = {
        settings: {
          autoLockEnabled: settings.autoLockEnabled,
          autoLockTimeout: settings.autoLockTimeout,
          webAuthnEnabled: settings.webAuthnEnabled,
          auditLogEnabled: settings.auditLogEnabled,
          auditLogRetention: settings.auditLogRetention,
          totpEnabled: settings.totpEnabled,
        },
        exportDate: new Date().toISOString(),
      };

      const settingsBlob = new Blob([JSON.stringify(securityData, null, 2)], {
        type: 'application/json',
      });
      const settingsUrl = URL.createObjectURL(settingsBlob);
      const settingsLink = document.createElement('a');
      settingsLink.href = settingsUrl;
      settingsLink.download = `security-settings-backup-${new Date().toISOString().split('T')[0]}.json`;
      settingsLink.click();
      URL.revokeObjectURL(settingsUrl);

      setExportDone(true);
      alert('✅ Sauvegarde créée !\n\n2 fichiers téléchargés :\n- vault-backup-[date].json (vos entrées)\n- security-settings-backup-[date].json (vos paramètres)');
      setStep('confirm');
    } catch (error) {
      console.error('Erreur export:', error);
      alert('❌ Erreur lors de la sauvegarde. Réessayez.');
    }
  };

  /**
   * Réinitialise complètement le coffre-fort
   */
  const handleCompleteReset = async () => {
    if (confirmText !== 'SUPPRIMER TOUT') {
      alert('❌ Vous devez taper exactement "SUPPRIMER TOUT" pour confirmer');
      return;
    }

    setStep('processing');

    try {
      console.log('🗑️ Avant suppression, localStorage contient:', Object.keys(localStorage));

      // 1. Supprime toutes les entrées du coffre (localStorage seulement)

      // 2. Supprime TOUTES les données localStorage
      localStorage.clear(); // Plus efficace que removeItem un par un

      console.log('✅ Après suppression, localStorage contient:', Object.keys(localStorage));

      // 3. Supprime sessionStorage
      sessionStorage.clear();

      console.log('✅ sessionStorage vidé');

      // 4. Redirige vers la page d'initialisation
      alert(
        '✅ Réinitialisation complète réussie !\n\n' +
        'Le coffre-fort a été entièrement supprimé.\n\n' +
        'Vous allez être redirigé vers la page de création de coffre.'
      );

      // Détecte le locale actuel (fr, en, etc.)
      const currentPath = window.location.pathname;
      const localeMatch = currentPath.match(/^\/([a-z]{2})\//);
      const locale = localeMatch ? localeMatch[1] : 'fr';

      console.log('🔄 Redirection vers:', `/${locale}/vault/init`);

      // Redirige vers /[locale]/vault/init
      setTimeout(() => {
        window.location.href = `/${locale}/vault/init`;
      }, 500);
    } catch (error) {
      console.error('Erreur réinitialisation:', error);
      alert('❌ Erreur lors de la réinitialisation. Vérifiez la console (F12).');
      setStep('confirm');
    }
  };

  return (
    <div className="vault-modal-overlay" onClick={onClose}>
      <div className="vault-modal vault-reset-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vault-modal-header">
          <h2>🔴 Réinitialisation Complète du Coffre-Fort</h2>
          {/* <button onClick={onClose} className="vault-modal-close">✕</button> */}
        </div>

        <div className="vault-modal-body">
          {step === 'warning' && (
            <>
              <div className="security-info-box security-info-box-error">
                <h3 className="security-info-box-error-title">⚠️ ATTENTION - ACTION IRRÉVERSIBLE</h3>
                <p className="security-info-box-error-text">
                  Cette action va <strong>SUPPRIMER DÉFINITIVEMENT</strong> :
                </p>
                <ul className="vault-reset-list">
                  <li>✖️ Toutes vos entrées du coffre ({entries.length} entrée(s))</li>
                  <li>✖️ Tous vos paramètres de sécurité</li>
                  <li>✖️ Vos codes de récupération</li>
                  <li>✖️ Votre passphrase maître</li>
                  <li>✖️ Vos dossiers et organisations</li>
                  <li>✖️ Tout l&apos;historique et les audits</li>
                </ul>
                <p className="security-info-box-error-text">
                  <strong>Résultat :</strong> Le coffre-fort reviendra à l&apos;état initial,<br/>
                  comme si vous ne l&apos;aviez jamais utilisé.
                </p>
              </div>

              <div className="security-info-box">
                <h4>💡 Pourquoi utiliser cette fonction ?</h4>
                <ul className="vault-reset-use-cases">
                  <li>🔄 Vous êtes bloqué et ne pouvez plus accéder au coffre</li>
                  <li>🧪 Vous voulez repartir de zéro en développement/test</li>
                  <li>👤 Vous voulez préparer le système pour un nouvel utilisateur</li>
                  <li>🗑️ Vous voulez supprimer toutes vos données du navigateur</li>
                </ul>
              </div>

              <div className="vault-reset-actions">
                <button onClick={onClose} className="vault-btn vault-btn-secondary">
                  ← Annuler
                </button>
                <button
                  onClick={() => setStep('export')}
                  className="vault-btn vault-btn-danger"
                >
                  Continuer la réinitialisation →
                </button>
              </div>
            </>
          )}

          {step === 'export' && (
            <>
              <div className="security-info-box">
                <h3>💾 Sauvegarde recommandée</h3>
                <p>
                  Avant de tout supprimer, nous vous recommandons <strong>fortement</strong> de
                  sauvegarder vos données actuelles.
                </p>
                <p className="vault-reset-export-details">
                  Cela créera 2 fichiers JSON :<br/>
                  • <strong>vault-backup-[date].json</strong> : Vos {entries.length} entrée(s)<br/>
                  • <strong>security-settings-backup-[date].json</strong> : Vos paramètres
                </p>
                {exportDone && (
                  <p className="vault-reset-export-success">
                    ✅ <strong>Sauvegarde créée avec succès !</strong>
                  </p>
                )}
              </div>

              <div className="vault-reset-actions">
                <button onClick={onClose} className="vault-btn vault-btn-secondary">
                  ← Annuler
                </button>
                <button
                  onClick={handleExportBeforeReset}
                  className="vault-btn vault-btn-primary"
                  disabled={exportDone}
                >
                  {exportDone ? '✅ Sauvegarde faite' : '💾 Sauvegarder maintenant'}
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  className="vault-btn vault-btn-danger"
                >
                  {exportDone ? 'Continuer →' : 'Passer (non recommandé) →'}
                </button>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="security-info-box security-info-box-error">
                <h3 className="security-info-box-error-title">🔴 CONFIRMATION FINALE</h3>
                <p className="security-info-box-error-text">
                  Pour confirmer la suppression <strong>DÉFINITIVE</strong> de toutes vos données,
                  tapez exactement :
                </p>
                <p className="vault-reset-confirm-code">
                  <strong>SUPPRIMER TOUT</strong>
                </p>
              </div>

              <div className="vault-form-group">
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Tapez: SUPPRIMER TOUT"
                  className="vault-input vault-reset-input"
                  autoFocus
                />
              </div>

              {!exportDone && (
                <div className="security-info-box security-info-box-error">
                  <p className="security-info-box-error-text">
                    ⚠️ <strong>Vous n&apos;avez pas sauvegardé vos données !</strong><br/>
                    Êtes-vous sûr de vouloir continuer ?
                  </p>
                </div>
              )}

              <div className="vault-reset-actions">
                <button onClick={onClose} className="vault-btn vault-btn-secondary">
                  ← Annuler
                </button>
                <button
                  onClick={handleCompleteReset}
                  className="vault-btn vault-btn-danger"
                  disabled={confirmText !== 'SUPPRIMER TOUT'}
                >
                  🔴 SUPPRIMER DÉFINITIVEMENT
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="vault-reset-processing">
              <div className="vault-reset-spinner">⏳</div>
              <h3>Réinitialisation en cours...</h3>
              <p>Suppression de toutes les données...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
