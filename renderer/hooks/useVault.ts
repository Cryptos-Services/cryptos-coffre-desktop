/**
 * Hook React pour la gestion du coffre numérique
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  VaultEntry,
  DecryptedEntry,
  CreateEntryParams,
  UpdateEntryParams,
} from '../types/vault';
import { encrypt, decrypt, deriveKey, base64ToSalt } from '../lib/encryption';
import { useSecuritySettings } from './useSecuritySettings';
import { addAuditLog } from '../lib/auditLog';

interface UseVaultState {
  entries: DecryptedEntry[];
  loading: boolean;
  error: string | null;
  isUnlocked: boolean;
}

interface UseVaultActions {
  unlock: (passphrase: string) => Promise<boolean>;
  lock: () => void;
  addEntry: (params: CreateEntryParams) => Promise<void>;
  updateEntry: (params: UpdateEntryParams) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  refreshEntries: () => Promise<void>;
}

/**
 * Hook principal pour gérer le coffre
 */
export function useVault(): UseVaultState & UseVaultActions {
  const { settings } = useSecuritySettings();
  const [entries, setEntries] = useState<DecryptedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Déverrouille le coffre avec la passphrase
   */
  const unlock = useCallback(async (passphrase: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Récupère le salt depuis le localStorage (ou API)
      const saltBase64 = localStorage.getItem('vault_salt');
      if (!saltBase64) {
        throw new Error('Aucun coffre trouvé. Veuillez en créer un.');
      }

      const salt = base64ToSalt(saltBase64);
      const key = await deriveKey(passphrase, salt);

      // Vérifie la passphrase en essayant de charger les entrées
      await fetchAndDecryptEntries(key);

      setEncryptionKey(key);
      setIsUnlocked(true);
      
      // Stocke temporairement la passphrase pour la génération des codes de récupération
      sessionStorage.setItem('vault_passphrase_temp', passphrase);
      
      setLoading(false);
      return true;
    } catch (err) {
      setError('Passphrase incorrecte ou erreur de déchiffrement');
      setLoading(false);
      return false;
    }
  }, []);

  /**
   * Verrouille le coffre
   */
  const lock = useCallback(() => {
    setEntries([]);
    setEncryptionKey(null);
    setIsUnlocked(false);
        // Nettoie la passphrase temporaire
    sessionStorage.removeItem('vault_passphrase_temp');
        // Nettoie le timer
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
      autoLockTimerRef.current = null;
    }
  }, []);

  /**
   * Réinitialise le timer de verrouillage automatique
   */
  const resetAutoLockTimer = useCallback(() => {
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
    }

    // Vérifie si l'auto-lock est activé
    if (isUnlocked && settings.autoLockEnabled) {
      const timeoutMs = settings.autoLockTimeout * 60 * 1000; // Convertir minutes en ms
      autoLockTimerRef.current = setTimeout(() => {
        console.log(`🔒 Verrouillage automatique après ${settings.autoLockTimeout} minutes d'inactivité`);
        addAuditLog('vault_lock', { reason: 'auto-lock', timeout: settings.autoLockTimeout });
        lock();
      }, timeoutMs);
    }
  }, [isUnlocked, lock, settings.autoLockEnabled, settings.autoLockTimeout]);

  /**
   * Détecte l'activité de l'utilisateur et réinitialise le timer
   */
  useEffect(() => {
    if (!isUnlocked || !settings.autoLockEnabled) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetAutoLockTimer();
    };

    // Ajoute les écouteurs d'événements
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Démarre le timer initial
    resetAutoLockTimer();

    // Nettoie les écouteurs
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
      }
    };
  }, [isUnlocked, settings.autoLockEnabled, resetAutoLockTimer]);

  /**
   * Récupère et déchiffre les entrées
   */
  const fetchAndDecryptEntries = async (key: CryptoKey) => {
    // TOUJOURS valider la passphrase avec le canary (même si coffre vide)
    const canaryStr = localStorage.getItem('vault_canary');
    if (canaryStr) {
      try {
        const { encryptedData, iv } = JSON.parse(canaryStr);
        const decrypted = await decrypt(encryptedData, iv, key);
        if (decrypted !== 'VAULT_VALID') {
          throw new Error('Passphrase incorrecte');
        }
      } catch (err) {
        throw new Error('Passphrase incorrecte');
      }
    }
    
    // Récupère depuis localStorage (pas d'API backend dans Electron)
    const vaultDataStr = localStorage.getItem('vault_data');
    
    if (!vaultDataStr) {
      // Pas de données = coffre vide (valide)
      setEntries([]);
      return;
    }

    let encryptedEntries: VaultEntry[];
    
    try {
      encryptedEntries = JSON.parse(vaultDataStr);
    } catch (err) {
      throw new Error('Données du coffre corrompues');
    }

    // Si le coffre est vide, pas besoin de déchiffrer
    if (!Array.isArray(encryptedEntries) || encryptedEntries.length === 0) {
      setEntries([]);
      return;
    }

    // Déchiffre les entrées
    const decryptedEntries: DecryptedEntry[] = await Promise.all(
      encryptedEntries.map(async (entry) => {
        const decryptedDataStr = await decrypt(entry.encryptedData, entry.iv, key);
        const parsedData = JSON.parse(decryptedDataStr);

        return {
          id: entry.id,
          type: entry.type,
          name: entry.name,
          meta: entry.meta,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          data: parsedData,
          folderId: entry.folderId,
          tags: entry.tags,
        };
      })
    );

    setEntries(decryptedEntries);
  };

  /**
   * Rafraîchit les entrées
   */
  const refreshEntries = useCallback(async () => {
    if (!encryptionKey) return;

    setLoading(true);
    setError(null);

    try {
      await fetchAndDecryptEntries(encryptionKey);
      setLoading(false);
    } catch (err) {
      setError('Erreur lors du rafraîchissement des entrées');
      setLoading(false);
    }
  }, [encryptionKey]);

  /**
   * Ajoute une nouvelle entrée
   */
  const addEntry = useCallback(
    async (params: CreateEntryParams) => {
      if (!encryptionKey) {
        setError('Le coffre doit être déverrouillé');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Chiffre les données côté client
        const dataStr = JSON.stringify(params.data);
        const { encryptedData, iv } = await encrypt(dataStr, encryptionKey);

        // Crée la nouvelle entrée
        const newEntry: VaultEntry = {
          id: crypto.randomUUID(),
          type: params.type,
          name: params.name,
          encryptedData,
          iv,
          meta: params.meta || {},
          folderId: params.folderId ?? null,
          tags: params.tags ?? [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Récupère les entrées existantes depuis localStorage
        const vaultDataStr = localStorage.getItem('vault_data');
        const existingEntries: VaultEntry[] = vaultDataStr ? JSON.parse(vaultDataStr) : [];

        // Ajoute la nouvelle entrée
        existingEntries.push(newEntry);

        // Sauvegarde dans localStorage
        localStorage.setItem('vault_data', JSON.stringify(existingEntries));

        await refreshEntries();
      } catch (err) {
        setError('Erreur lors de l\'ajout de l\'entrée');
      } finally {
        setLoading(false);
      }
    },
    [encryptionKey, refreshEntries]
  );

  /**
   * Met à jour une entrée
   */
  const updateEntry = useCallback(
    async (params: UpdateEntryParams) => {
      if (!encryptionKey) {
        setError('Le coffre doit être déverrouillé');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Récupère les entrées existantes
        const vaultDataStr = localStorage.getItem('vault_data');
        if (!vaultDataStr) {
          throw new Error('Aucune donnée trouvée');
        }

        const existingEntries: VaultEntry[] = JSON.parse(vaultDataStr);
        const entryIndex = existingEntries.findIndex(e => e.id === params.id);

        if (entryIndex === -1) {
          throw new Error('Entrée introuvable');
        }

        // Récupère l'entrée à modifier
        const entry = existingEntries[entryIndex];

        // Si les données sont modifiées, les rechiffrer
        if (params.data) {
          const dataStr = JSON.stringify(params.data);
          const result = await encrypt(dataStr, encryptionKey);
          entry.encryptedData = result.encryptedData;
          entry.iv = result.iv;
        }

        // Met à jour les autres champs
        if (params.name !== undefined) entry.name = params.name;
        if (params.meta !== undefined) entry.meta = params.meta;
        if (params.folderId !== undefined) entry.folderId = params.folderId;
        if (params.tags !== undefined) entry.tags = params.tags;
        entry.updatedAt = new Date().toISOString();

        // Sauvegarde dans localStorage
        localStorage.setItem('vault_data', JSON.stringify(existingEntries));

        await refreshEntries();
      } catch (err) {
        setError('Erreur lors de la mise à jour de l\'entrée');
      } finally {
        setLoading(false);
      }
    },
    [encryptionKey, refreshEntries]
  );

  /**
   * Supprime une entrée
   */
  const deleteEntry = useCallback(
    async (id: string) => {
      if (!encryptionKey) {
        setError('Le coffre doit être déverrouillé');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Récupère les entrées existantes
        const vaultDataStr = localStorage.getItem('vault_data');
        if (!vaultDataStr) {
          throw new Error('Aucune donnée trouvée');
        }

        const existingEntries: VaultEntry[] = JSON.parse(vaultDataStr);

        // Filtre pour supprimer l'entrée
        const filteredEntries = existingEntries.filter(e => e.id !== id);

        // Sauvegarde dans localStorage
        localStorage.setItem('vault_data', JSON.stringify(filteredEntries));

        await refreshEntries();
      } catch (err) {
        setError('Erreur lors de la suppression de l\'entrée');
      } finally {
        setLoading(false);
      }
    },
    [encryptionKey, refreshEntries]
  );

  return {
    entries,
    loading,
    error,
    isUnlocked,
    unlock,
    lock,
    addEntry,
    updateEntry,
    deleteEntry,
    refreshEntries,
  };
}
