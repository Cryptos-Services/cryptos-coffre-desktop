'use client';

/**
 * Page de récupération du coffre en cas d'oubli de la passphrase
 */

import { useState } from 'react';
import { useSecuritySettings } from '../hooks/useSecuritySettings';
import { deriveKeysWithSalt, saltToBase64 } from '../lib/encryption';
import { addAuditLog } from '../lib/auditLog';
import '../styles/VaultDashboard.css';

interface PasswordRecoveryProps {
  onBack: () => void;
  onRecoverySuccess: (passphrase: string) => void;
  passphraseHint?: string;
}

export default function PasswordRecovery({
  onBack,
  onRecoverySuccess,
  passphraseHint,
}: PasswordRecoveryProps) {
  const { settings, saveSettings } = useSecuritySettings();
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'code' | 'passphrase'>('code');
  const [loading, setLoading] = useState(false);

  const handleVerifyCode = () => {
    setError(null);

    const cleanCode = recoveryCode.replace(/\s|-/g, '').toUpperCase();
    
    console.log('🔍 Vérification code:', cleanCode);
    console.log('📋 Codes disponibles:', settings.recoveryCodes.map(rc => ({
      code: rc.code,
      normalized: rc.code.replace(/\s|-/g, '').toUpperCase(),
      used: rc.used
    })));
    
    // Vérifie si le code existe et n'est pas utilisé
    const code = settings.recoveryCodes.find(
      (rc) => rc.code.replace(/\s|-/g, '').toUpperCase() === cleanCode && !rc.used
    );

    if (!code) {
      setError('❌ Code de récupération invalide ou déjà utilisé');
      console.error('❌ Code non trouvé ou déjà utilisé');
      return;
    }

    console.log('✅ Code valide trouvé:', code.code);
    
    // IMPORTANT: Marquer immédiatement le code comme "en cours d'utilisation"
    // Pour éviter qu'il soit réutilisé si l'utilisateur rafraîchit la page
    const updatedCodes = settings.recoveryCodes.map((rc) =>
      rc.code.replace(/\s|-/g, '').toUpperCase() === cleanCode
        ? { ...rc, used: true, usedAt: new Date().toISOString() }
        : rc
    );
    
    saveSettings({ recoveryCodes: updatedCodes });
    console.log('💾 Code marqué comme utilisé et sauvegardé');

    setStep('passphrase');
  };

  const handleResetPassphrase = async () => {
    setError(null);
    setLoading(true);

    if (newPassphrase.length < 8) {
      setError('⚠️ La passphrase doit contenir au moins 8 caractères');
      setLoading(false);
      return;
    }

    if (newPassphrase !== confirmPassphrase) {
      setError('⚠️ Les passphrases ne correspondent pas');
      setLoading(false);
      return;
    }

    try {
      const cleanCode = recoveryCode.replace(/\s|-/g, '').toUpperCase();
      
      // 1. Vérifie si une clé de récupération chiffrée existe
      const encryptedRecoveryKey = settings.encryptedRecoveryKey;
      
      if (!encryptedRecoveryKey) {
        // ⚠️ FALLBACK: Ancien système sans clé de récupération
        // Les codes ont été générés avant l'implémentation de la clé chiffrée
        // On doit faire une réinitialisation avec PERTE de données
        
        const confirmReset = confirm(
          '⚠️ ATTENTION - Ancien système de codes\n\n' +
          'Vos codes de récupération ont été générés avec l\'ancien système.\n' +
          'Il est IMPOSSIBLE de récupérer vos données sans votre passphrase originale.\n\n' +
          '🔴 Si vous continuez :\n' +
          '   • Toutes vos données actuelles seront PERDUES\n' +
          '   • Vous pourrez définir une nouvelle passphrase\n' +
          '   • Le coffre sera réinitialisé à vide\n\n' +
          '💡 Conseil : Si vous avez exporté vos données, vous pourrez les réimporter.\n\n' +
          'Voulez-vous continuer la RÉINITIALISATION ?'
        );
        
        if (!confirmReset) {
          setLoading(false);
          return;
        }
        
        // Réinitialisation avec perte de données (ancien système)
        const { deriveKeysWithSalt, saltToBase64 } = await import('../lib/encryption');
        
        // Génère une nouvelle clé depuis la nouvelle passphrase
        const { salt: newSalt } = await deriveKeysWithSalt(newPassphrase);
        
        // Sauvegarde le nouveau salt
        localStorage.setItem('vault_salt', saltToBase64(newSalt));
        
        // Vide le coffre (localStorage uniquement)
        localStorage.removeItem('vault_data');
        
        // Le code a déjà été marqué comme utilisé dans handleVerifyCode
        console.log('✅ Réinitialisation (ancien système) terminée');
        
        // Log d'audit
        addAuditLog('password_recovery', {
          success: true,
        });
        
        setLoading(false);
        
        alert(
          '✅ Réinitialisation réussie!\n\n' +
          '⚠️ Votre coffre a été réinitialisé.\n' +
          'Toutes les anciennes données ont été supprimées.\n\n' +
          'Vous pouvez maintenant:\n' +
          '1. Déverrouiller le coffre avec votre nouvelle passphrase\n' +
          '2. Créer de nouvelles entrées\n' +
          '3. Si vous aviez exporté vos données, les réimporter\n' +
          '4. IMPORTANT: Générer de NOUVEAUX codes de récupération\n' +
          '   (les anciens codes ne fonctionneront plus)'
        );
        
        onRecoverySuccess(newPassphrase);
        return;
      }

      // 2. NOUVEAU SYSTÈME: Récupération avec clé chiffrée (SANS perte)
      console.log('🔐 Démarrage de la récupération (nouveau système)...');
      
      // Import des fonctions de chiffrement
      const { 
        decryptRecoveryKey, 
        deriveKeysWithSalt, 
        deriveKey,
        saltToBase64, 
        base64ToSalt,
        encrypt,
        decrypt 
      } = await import('../lib/encryption');

      // 3. Déchiffre la passphrase de récupération avec les codes fournis
      console.log('🔑 Déchiffrement de la passphrase avec les codes de récupération...');
      const allCodes = settings.recoveryCodes.map(rc => rc.code);
      const originalPassphrase = await decryptRecoveryKey(
        encryptedRecoveryKey.encryptedData,
        encryptedRecoveryKey.iv,
        encryptedRecoveryKey.salt,
        allCodes
      );
      console.log('✅ Passphrase originale déchiffrée avec succès');

      // 4. Récupère le salt original pour recréer la clé
      const originalSaltBase64 = localStorage.getItem('vault_salt');
      if (!originalSaltBase64) {
        throw new Error('Salt original introuvable');
      }
      const originalSalt = base64ToSalt(originalSaltBase64);
      const originalKey = await deriveKey(originalPassphrase, originalSalt);

      // 5. Récupère toutes les entrées du coffre depuis localStorage
      console.log('📦 Récupération des entrées depuis localStorage...');
      const vaultDataStr = localStorage.getItem('vault_data');
      if (!vaultDataStr) {
        throw new Error('Impossible de charger les entrées du coffre');
      }
      const entries = JSON.parse(vaultDataStr);
      console.log(`📊 ${entries.length} entrée(s) chargée(s) depuis localStorage`);
      
      if (entries.length === 0) {
        console.warn('⚠️ ATTENTION: Aucune entrée trouvée dans localStorage !');
        console.warn('Le vault_data pourrait être vide ou corrompu.');
      }

      // 6. Déchiffre toutes les entrées avec la clé originale
      const decryptedEntries = await Promise.all(
        entries.map(async (entry: any) => {
          try {
            const decryptedData = await decrypt(entry.encryptedData, entry.iv, originalKey);
            return { ...entry, decryptedData };
          } catch (err) {
            console.error('Erreur déchiffrement entrée:', entry.id, err);
            return null;
          }
        })
      );

      // Filtre les entrées qui n'ont pas pu être déchiffrées
      const validEntries = decryptedEntries.filter(e => e !== null);
      console.log(`✅ ${validEntries.length}/${entries.length} entrée(s) déchiffrée(s) avec succès`);
      
      if (validEntries.length === 0 && entries.length > 0) {
        throw new Error(
          `Impossible de déchiffrer les entrées (${entries.length} entrée(s) trouvée(s)). ` +
          'La passphrase déchiffrée depuis les codes de récupération ne correspond pas.'
        );
      }

      // 7. Génère une nouvelle clé depuis la nouvelle passphrase
      const { encryptionKey: newKey, salt: newSalt } = await deriveKeysWithSalt(newPassphrase);
      
      // 8. Rechiffre toutes les entrées avec la nouvelle clé
      console.log('🔐 Rechiffrement des entrées avec la nouvelle passphrase...');
      const reencryptedEntries = await Promise.all(
        validEntries.map(async (entry: any) => {
          const { encryptedData, iv } = await encrypt(entry.decryptedData, newKey);
          return {
            ...entry,
            encryptedData,
            iv,
            decryptedData: undefined, // Supprime les données en clair
          };
        })
      );
      console.log(`✅ ${reencryptedEntries.length} entrée(s) rechiffrée(s)`);
      
      if (reencryptedEntries.length === 0) {
        throw new Error(
          'ERREUR CRITIQUE: Aucune entrée à sauvegarder. ' +
          'La récupération est annulée pour éviter la perte de données.'
        );
      }

      // 9. Sauvegarde les entrées rechiffrées dans localStorage
      console.log('💾 Sauvegarde des entrées rechiffrées dans localStorage...');
      localStorage.setItem('vault_data', JSON.stringify(reencryptedEntries));
      console.log('✅ Sauvegarde réussie dans localStorage');
      console.log(`📊 ${reencryptedEntries.length} entrée(s) sauvegardée(s) dans vault_data`);

      // 10. Sauvegarde le nouveau salt
      localStorage.setItem('vault_salt', saltToBase64(newSalt));

      // 11. Invalide l'ancienne clé de récupération (le code a déjà été marqué utilisé)
      saveSettings({ 
        encryptedRecoveryKey: undefined, // Invalide l'ancienne clé
      });
      
      console.log(`✅ Récupération (nouveau système) terminée - ${validEntries.length} entrées`);

      // 12. Log d'audit
      addAuditLog('password_recovery', {
        success: true,
      });

      setLoading(false);
      
      // 12. Avertir l'utilisateur du succès
      alert(
        '✅ Récupération réussie!\n\n' +
        `🔒 ${validEntries.length} entrée(s) récupérée(s) et rechiffrée(s)\n\n` +
        '🔴 ACTION OBLIGATOIRE:\n' +
        '1. Votre coffre est maintenant protégé par votre nouvelle passphrase\n' +
        '2. TOUS les anciens codes de récupération sont INVALIDES\n' +
        '3. Allez IMMÉDIATEMENT dans:\n' +
        '   📁 Coffre-Fort → ⚙️ Paramètres → 🔐 Sécurité → 🔑 Récupération\n' +
        '4. Cliquez sur "🔄 Régénérer" pour créer de NOUVEAUX codes\n\n' +
        '⚠️ Sans nouveaux codes, vous ne pourrez pas récupérer\n' +
        '   votre coffre si vous perdez votre nouvelle passphrase.\n\n' +
        '🚨 Une alerte ROUGE apparaîtra sur l\'interface pour vous rappeler.'
      );
      
      onRecoverySuccess(newPassphrase);
    } catch (err) {
      console.error('❌ ERREUR CRITIQUE lors de la récupération:', err);
      console.error('Type d\'erreur:', err instanceof Error ? 'Error' : typeof err);
      console.error('Message:', err instanceof Error ? err.message : String(err));
      console.error('Stack:', err instanceof Error ? err.stack : 'N/A');
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      setError(
        `❌ Erreur lors de la récupération:\n\n${errorMessage}\n\nVérifiez la console (F12) pour plus de détails.`
      );
      setLoading(false);
      
      addAuditLog('password_recovery', {
        success: false,
        errorMessage,
      });
      
      // Affiche l'erreur détaillée à l'utilisateur
      alert(
        `❌ Échec de la récupération\n\n` +
        `Erreur: ${errorMessage}\n\n` +
        `Ouvrez la console (F12) pour voir les détails complets.`
      );
    }
  };

  return (
    <div className="password-recovery-container">
      <h2 className="password-recovery-title">
        🔓 Récupération du Coffre
      </h2>

      {step === 'code' && (
        <>
          <div className="password-recovery-info-box">
            <p className="password-recovery-info-text">
              💡 Utilisez un de vos <strong>codes de récupération</strong> pour réinitialiser votre passphrase.
            </p>
          </div>

          {passphraseHint && (
            <div className="password-recovery-hint-box">
              <p className="password-recovery-hint-title">
                💡 Indice :
              </p>
              <p className="password-recovery-hint-text">
                {passphraseHint}
              </p>
            </div>
          )}

          <div className="password-recovery-input-group">
            <label className="password-recovery-label">
              Code de récupération :
            </label>
            <input
              type="text"
              value={recoveryCode}
              onChange={(e) => {
                setRecoveryCode(e.target.value);
                setError(null);
              }}
              placeholder="XXXX-XXXX-XXXX"
              className="vault-input-recovery password-recovery-input-code"
              autoFocus
            />
            <p className="password-recovery-input-help">
              Entrez un code au format XXXX-XXXX-XXXX
            </p>
          </div>

          {error && (
            <div className="password-recovery-error-box">
              {error}
            </div>
          )}

          <div className="password-recovery-buttons">
            <button
              onClick={onBack}
              className="vault-btn vault-btn-secondary password-recovery-button-flex-1"
            >
              ← Retour
            </button>
            <button
              onClick={handleVerifyCode}
              disabled={!recoveryCode}
              className="vault-btn vault-btn-primary password-recovery-button-flex-2"
            >
              Vérifier le code →
            </button>
          </div>
        </>
      )}

      {step === 'passphrase' && (
        <>
          <div className="password-recovery-success-box">
            <p className="password-recovery-success-title">
              ✅ Code de récupération valide !
            </p>
            <p className="password-recovery-success-text">
              Vous pouvez maintenant définir une nouvelle passphrase.
            </p>
          </div>

          <div className="password-recovery-input-group">
            <label className="password-recovery-label">
              Nouvelle passphrase :
            </label>
            <input
              type="password"
              value={newPassphrase}
              onChange={(e) => {
                setNewPassphrase(e.target.value);
                setError(null);
              }}
              placeholder="Minimum 8 caractères"
              className="vault-input"
              autoFocus
            />
          </div>

          <div className="password-recovery-input-group">
            <label className="password-recovery-label">
              Confirmer la passphrase :
            </label>
            <input
              type="password"
              value={confirmPassphrase}
              onChange={(e) => {
                setConfirmPassphrase(e.target.value);
                setError(null);
              }}
              placeholder="Retapez la passphrase"
              className="vault-input"
            />
          </div>

          {error && (
            <div className="password-recovery-error-box">
              {error}
            </div>
          )}

          <div className="password-recovery-warning-box">
            <p className="password-recovery-warning-text">
              ⚠️ <strong>Important :</strong> Cette opération va re-chiffrer toutes vos données 
              avec la nouvelle passphrase. Le code de récupération utilisé sera marqué comme consommé.
            </p>
          </div>

          <div className="password-recovery-buttons">
            <button
              onClick={() => setStep('code')}
              className="vault-btn vault-btn-secondary password-recovery-button-flex-1"
              disabled={loading}
            >
              ← Retour
            </button>
            <button
              onClick={handleResetPassphrase}
              disabled={!newPassphrase || !confirmPassphrase || loading}
              className="vault-btn vault-btn-primary password-recovery-button-flex-2"
            >
              {loading ? '⏳ Réinitialisation...' : '✅ Réinitialiser la passphrase'}
            </button>
          </div>
        </>
      )}

      <div className="password-recovery-footer">
        <h4 className="password-recovery-footer-title">
          ❓ Vous n&apos;avez pas vos codes de récupération ?
        </h4>
        <div className="password-recovery-danger-box">
          <p className="password-recovery-danger-text">
            ⚠️ Sans code de récupération valide, il est <strong>impossible</strong> de récupérer 
            l&apos;accès à votre coffre. Vos données sont chiffrées avec votre passphrase et ne peuvent 
            pas être récupérées sans elle.
          </p>
          <p className="password-recovery-danger-text-margin">
            Vous devrez créer un nouveau coffre et perdrez toutes vos données actuelles.
          </p>
        </div>
      </div>
    </div>
  );
}
