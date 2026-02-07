/**
 * Hook React pour gérer les paramètres de sécurité
 */

import { useState, useEffect, useCallback } from 'react';
import { SecuritySettings, RecoveryCode } from '../types/security';
import { generateRecoveryCodes, countUnusedCodes } from '../lib/recoveryCodes';
import { cleanOldAuditLogs } from '../lib/auditLog';

const SECURITY_SETTINGS_KEY = 'vault-security-settings';

const DEFAULT_SETTINGS: SecuritySettings = {
  autoLockEnabled: true,
  autoLockTimeout: 10, // 10 minutes
  webAuthnEnabled: false,
  auditLogEnabled: true,
  auditLogRetention: 90, // 90 jours
  maxLoginAttempts: 5,
  lockoutDuration: 5, // 5 minutes
  recoveryCodes: [],
  recoveryCodesGenerated: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function useSecuritySettings() {
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  /**
   * Charge les paramètres depuis localStorage
   */
  const loadSettings = useCallback(() => {
    try {
      const stored = localStorage.getItem(SECURITY_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charge les paramètres au montage
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Nettoie les anciens logs selon la rétention configurée
  useEffect(() => {
    if (settings.auditLogEnabled) {
      cleanOldAuditLogs(settings.auditLogRetention);
    }
  }, [settings.auditLogEnabled, settings.auditLogRetention]);

  /**
   * Sauvegarde les paramètres
   */
  const saveSettings = useCallback((newSettings: Partial<SecuritySettings>) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        ...newSettings,
        updatedAt: new Date().toISOString(),
      };
      
      try {
        localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres:', error);
      }
      
      return updated;
    });
  }, []);

  /**
   * Génère de nouveaux codes de récupération
   */
  const generateNewRecoveryCodes = useCallback(async (): Promise<RecoveryCode[]> => {
    const codes = generateRecoveryCodes(10);
    
    // Récupère la clé de chiffrement actuelle pour la protéger avec les codes
    const saltBase64 = localStorage.getItem('vault_salt');
    if (!saltBase64) {
      console.error('Impossible de générer les codes : aucun sel trouvé');
      return codes; // Retourne les codes sans clé chiffrée (fallback)
    }
    
    try {
      // Import des fonctions nécessaires
      const { base64ToSalt } = await import('../lib/encryption');
      const { deriveKey, encryptRecoveryKey } = await import('../lib/encryption');
      
      // Récupère la passphrase depuis le sessionStorage
      const currentPassphrase = sessionStorage.getItem('vault_passphrase_temp');
      if (!currentPassphrase) {
        throw new Error('Passphrase non disponible. Réessayez et entrez votre passphrase.');
      }
      
      // console.log('📝 Passphrase récupérée, génération de la clé de récupération...');
      
      // IMPORTANT: Vérifie que la passphrase est correcte avant de créer les codes
      const salt = base64ToSalt(saltBase64);
      
      try {
        // Vérifie que la passphrase est valide en dérivant la clé
        const testKey = await deriveKey(currentPassphrase, salt);
        // console.log('✅ Passphrase validée avec succès');
        
        // NOUVEAU: Teste le déchiffrement d'une entrée existante pour vérifier
        const vaultDataStr = localStorage.getItem('vault_data');
        if (vaultDataStr) {
          const entries = JSON.parse(vaultDataStr);
          if (entries.length > 0) {
            // Teste le déchiffrement de la première entrée
            const { decrypt } = await import('../lib/encryption');
            try {
              await decrypt(entries[0].encryptedData, entries[0].iv, testKey);
              // console.log('✅ Test de déchiffrement réussi - la passphrase correspond aux entrées');
            } catch (decryptErr) {
              console.error('❌ Test de déchiffrement échoué:', decryptErr);
              throw new Error(
                'La passphrase actuelle ne peut pas déchiffrer vos entrées existantes. ' +
                'Cela peut arriver si le coffre a été réinitialisé. ' +
                'Impossible de générer des codes de récupération valides.'
              );
            }
          }
        }
      } catch (error) {
        console.error('❌ Erreur lors de la validation de la passphrase:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Passphrase incorrecte ou problème de dérivation de clé'
        );
      }
      
      // Chiffre la passphrase originale (pas la CryptoKey) avec les codes de récupération
      const encryptedKey = await encryptRecoveryKey(
        currentPassphrase, // On chiffre la passphrase, pas la CryptoKey
        codes.map(c => c.code)
      );
      
      // Sauvegarde les codes ET la clé chiffrée
      saveSettings({
        recoveryCodes: codes,
        recoveryCodesGenerated: true,
        encryptedRecoveryKey: {
          encryptedData: encryptedKey.encryptedData,
          iv: encryptedKey.iv,
          salt: encryptedKey.salt!,
          createdAt: new Date().toISOString(),
        },
      });
      
      console.log('✅ Clé de récupération chiffrée créée avec succès');
      console.log('🔐 encryptedRecoveryKey créée:', {
        hasEncryptedData: !!encryptedKey.encryptedData,
        hasIV: !!encryptedKey.iv,
        hasSalt: !!encryptedKey.salt
      });
      
      // NE PAS nettoyer la passphrase - elle est nécessaire pour garder le coffre déverrouillé
      // sessionStorage.removeItem('vault_passphrase_temp');
      
      return codes;
    } catch (error) {
      console.error('❌ Erreur lors du chiffrement de la clé de récupération:', error);
      // NE PAS nettoyer la passphrase en cas d'erreur non plus
      // sessionStorage.removeItem('vault_passphrase_temp');
      throw error;
    }
  }, [saveSettings]);

  /**
   * Marque un code de récupération comme utilisé
   */
  const useRecoveryCode = useCallback((code: string) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        recoveryCodes: prev.recoveryCodes.map(rc =>
          rc.code === code
            ? { ...rc, used: true, usedAt: new Date().toISOString() }
            : rc
        ),
        updatedAt: new Date().toISOString(),
      };
      
      try {
        localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Erreur lors de la mise à jour du code:', error);
      }
      
      return updated;
    });
  }, []);

  /**
   * Met à jour le timeout d'auto-lock
   */
  const setAutoLockTimeout = useCallback((minutes: number) => {
    saveSettings({ autoLockTimeout: minutes });
  }, [saveSettings]);

  /**
   * Active/désactive l'auto-lock
   */
  const toggleAutoLock = useCallback((enabled: boolean) => {
    saveSettings({ autoLockEnabled: enabled });
  }, [saveSettings]);

  /**
   * Active/désactive le journal d'audit
   */
  const toggleAuditLog = useCallback((enabled: boolean) => {
    saveSettings({ auditLogEnabled: enabled });
  }, [saveSettings]);

  /**
   * Met à jour la rétention des logs
   */
  const setAuditLogRetention = useCallback((days: number) => {
    saveSettings({ auditLogRetention: days });
  }, [saveSettings]);

  /**
   * Met à jour les paramètres de protection brute-force
   */
  const setBruteForceProtection = useCallback((
    maxAttempts: number,
    lockoutMinutes: number
  ) => {
    saveSettings({
      maxLoginAttempts: maxAttempts,
      lockoutDuration: lockoutMinutes,
    });
  }, [saveSettings]);

  /**
   * Réinitialise tous les paramètres par défaut
   */
  const resetToDefaults = useCallback(() => {
    const defaults = {
      ...DEFAULT_SETTINGS,
      createdAt: settings.createdAt, // Garde la date de création
      updatedAt: new Date().toISOString(),
    };
    setSettings(defaults);
    localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(defaults));
  }, [settings.createdAt]);

  /**
   * Obtient les statistiques des codes de récupération
   */
  const getRecoveryCodeStats = useCallback(() => {
    return {
      total: settings.recoveryCodes.length,
      unused: countUnusedCodes(settings.recoveryCodes),
      used: settings.recoveryCodes.filter(rc => rc.used).length,
    };
  }, [settings.recoveryCodes]);

  return {
    settings,
    loading,
    saveSettings,
    generateNewRecoveryCodes,
    useRecoveryCode,
    setAutoLockTimeout,
    toggleAutoLock,
    toggleAuditLog,
    setAuditLogRetention,
    setBruteForceProtection,
    resetToDefaults,
    getRecoveryCodeStats,
  };
}
