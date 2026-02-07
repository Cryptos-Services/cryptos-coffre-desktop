'use client';

/**
 * Modal d'avertissement de sauvegarde des codes de récupération
 */

import { useState } from 'react';
import '../styles/VaultDashboard.css';

interface RecoveryWarningModalProps {
  onConfirm: () => void;
  onGenerateCodes: () => void;
  hasRecoveryCodes: boolean;
}

export default function RecoveryWarningModal({
  onConfirm,
  onGenerateCodes,
  hasRecoveryCodes,
}: RecoveryWarningModalProps) {
  const [hasConfirmed, setHasConfirmed] = useState(false);

  return (
    <div className="vault-modal-overlay">
      <div className="vault-modal recovery-modal-max-width">
        <h2 className="recovery-modal-title">
          ⚠️ IMPORTANT : Sauvegardez vos Codes de Récupération !
        </h2>

        <div className="recovery-warning-danger-box">
          <p className="recovery-warning-text-bold">
            🔐 Si vous oubliez votre passphrase, vos données seront PERDUES définitivement.
          </p>
          <p className="recovery-warning-text">
            Les <strong>codes de récupération</strong> sont le SEUL moyen de récupérer l&apos;accès à votre coffre.
          </p>
        </div>

        {!hasRecoveryCodes && (
          <>
            <div className="recovery-no-codes-box">
              <p className="recovery-no-codes-title">
                📋 Vous n&apos;avez pas encore généré vos codes de récupération !
              </p>
            </div>

            <div className="recovery-tip-box">
              <p className="recovery-tip-text">
                💡 <strong>Conseil :</strong> Conservez vos codes dans plusieurs endroits sûrs 
                (gestionnaire de mots de passe, coffre-fort physique, cloud chiffré).
              </p>
            </div>

            <div className="recovery-confirm-box">
              <input
                type="checkbox"
                id="confirm-backup-generate"
                checked={hasConfirmed}
                onChange={(e) => setHasConfirmed(e.target.checked)}
                className="recovery-confirm-checkbox"
              />
              <label 
                htmlFor="confirm-backup-generate" 
                className="recovery-confirm-label"
              >
                ✓ Je comprends les risques et veux générer mes codes de récupération et les sauvegarder dans un endroit sûr
              </label>
            </div>

            <button
              onClick={onGenerateCodes}
              disabled={!hasConfirmed}
              className={`vault-btn vault-btn-primary recovery-no-codes-button ${
                hasConfirmed ? 'recovery-button-enabled' : 'recovery-button-disabled'
              }`}
            >
              🎲 Générer mes Codes de Récupération
            </button>
          </>
        )}

        {hasRecoveryCodes && (
          <>
            <h3 className="recovery-checklist-title">✅ Avant de continuer, assurez-vous d&apos;avoir :</h3>
            <ul className="recovery-checklist">
              <li className="recovery-checklist-item">
                📝 <strong>Copié</strong> vos codes de récupération dans un endroit sûr
              </li>
              <li className="recovery-checklist-item">
                💾 <strong>Téléchargé</strong> le fichier de sauvegarde
              </li>
              <li className="recovery-checklist-item">
                🖨️ <strong>Imprimé</strong> vos codes (recommandé)
              </li>
              <li className="recovery-checklist-item">
                🔒 <strong>Stocké</strong> vos codes dans un endroit sécurisé (coffre-fort, gestionnaire de mots de passe)
              </li>
            </ul>
          </>
        )}

        {/*}
        <div className="recovery-buttons">
          <button
            onClick={onConfirm}
            disabled={!hasConfirmed}
            className={`vault-btn vault-btn-primary ${
              hasConfirmed ? 'recovery-button-enabled' : 'recovery-button-disabled'
            }`}
          >
            ✅ J&apos;ai compris, continuer
          </button>
        </div>
        */}

      </div>
    </div>
  );
}
