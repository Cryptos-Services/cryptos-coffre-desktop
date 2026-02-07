'use client';

/**
 * Tableau de bord principal du coffre numérique
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVault } from '../hooks/useVault';
import { CreateEntryParams, VaultEntryType, Folder } from '../types/vault';
import { detectImportFormat, parseKasperskyTXT, parseKasperskyCSV, parseGenericCSV } from '../lib/importParsers';
import { detectDuplicates } from '../lib/duplicateDetector';
import { addAuditLog } from '../lib/auditLog';
import { authenticateWithWebAuthn, updateCredentialLastUsed } from '../lib/webauthn';
import { verifyTOTPCode } from '../lib/totp';
import { useSecuritySettings } from '../hooks/useSecuritySettings';
import DuplicateCleaner from './DuplicateCleaner';
import PasswordGenerator from './PasswordGenerator';
import SecuritySettings from './SecuritySettings';
import RecoveryWarningModal from './RecoveryWarningModal';
import PasswordRecovery from './PasswordRecovery';
import '../styles/VaultDashboard.css';

interface VaultDashboardProps {
  onUnlockChange?: (unlocked: boolean) => void;
}

export default function VaultDashboard({ onUnlockChange }: VaultDashboardProps = {}) {
  const {
    entries,
    loading,
    error,
    isUnlocked,
    unlock,
    lock,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useVault();
  
  const { settings, saveSettings } = useSecuritySettings();

  const [passphrase, setPassphrase] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState<CreateEntryParams>({
    type: 'password',
    name: '',
    data: {},
  });
  
  // État pour la vérification 2FA
  const [show2FAPrompt, setShow2FAPrompt] = useState(false);
  
  // États pour afficher/masquer les mots de passe
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // États pour la limite de tentatives
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null);
  
  // État pour le modal de doublons
  const [showDuplicateCleaner, setShowDuplicateCleaner] = useState(false);
  
  // État pour le générateur de mots de passe
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  
  // État pour les paramètres de sécurité
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [securitySettingsTab, setSecuritySettingsTab] = useState<'autolock' | '2fa' | 'recovery' | 'audit' | 'advanced'>('autolock');
  
  // État pour l'upload de documents
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<VaultEntryType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'type'>('date');
  
  // État pour les statistiques détaillées
  const [showStats, setShowStats] = useState(false);
  
  // État pour l'export sélectif
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [exportMode, setExportMode] = useState(false);
  
  // États pour l'organisation (dossiers et tags)
  const [folders, setFolders] = useState<Folder[]>(() => {
    // Charger les dossiers depuis localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vault-folders');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderForm, setFolderForm] = useState({ name: '', color: '#3b82f6', icon: '📁' });
  const [draggedEntry, setDraggedEntry] = useState<string | null>(null);
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  const [totpCode, setTotpCode] = useState('');
  const [showTOTPPrompt, setShowTOTPPrompt] = useState(false);
  
  // États pour l'indice et la récupération
  const [passphraseHint, setPassphraseHint] = useState('');
  const [showRecoveryWarning, setShowRecoveryWarning] = useState(false);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false);
  
  // Charge l'indice depuis localStorage
  useEffect(() => {
    const storedHint = localStorage.getItem('passphrase-hint');
    if (storedHint) {
      setPassphraseHint(storedHint);
    }
  }, []);
  
  // Mapping local des entrées vers leurs dossiers (chargé depuis le backend)
  const [entryFolders, setEntryFolders] = useState<Record<string, string | null>>({});
  const isDraggingRef = useRef(false);
  const isFirstLoadRef = useRef(true);
  
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Gère le déverrouillage du coffre
   */
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifie si le compte est verrouillé
    if (isLocked && lockoutTime) {
      const now = new Date();
      const remainingTime = Math.ceil((lockoutTime.getTime() - now.getTime()) / 1000 / 60);
      if (remainingTime > 0) {
        alert(`Trop de tentatives échouées. Réessayez dans ${remainingTime} minute(s).`);
        return;
      } else {
        // Débloque après expiration
        setIsLocked(false);
        setLockoutTime(null);
        setAttemptCount(0);
      }
    }
    
    const success = await unlock(passphrase);
    if (success) {
      // Ordre de vérification: WebAuthn d'abord, puis TOTP
      if (settings.webAuthnEnabled && (settings.webAuthnCredentials || []).length > 0) {
        setShow2FAPrompt(true);
        await handle2FAVerification();
      } else if (settings.totpEnabled && settings.totpSecret) {
        setShowTOTPPrompt(true);
      } else {
        completeUnlock();
      }
    } else {
      // Log d'audit échec
      addAuditLog('failed_login', {
        success: false,
        userAgent: navigator.userAgent,
      });
      // Incrémente le compteur d'échecs
      const newCount = attemptCount + 1;
      setAttemptCount(newCount);
      
      if (newCount >= MAX_ATTEMPTS) {
        // Verrouille le compte
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION);
        setIsLocked(true);
        setLockoutTime(lockUntil);
        alert(`Trop de tentatives échouées. Compte verrouillé pendant 5 minutes.`);
      } else {
        alert(`Tentative ${newCount}/${MAX_ATTEMPTS}. Encore ${MAX_ATTEMPTS - newCount} tentative(s) avant verrouillage.`);
      }
    }
  };
  
  /**
   * Vérifie la 2FA avec WebAuthn
   */
  const handle2FAVerification = async () => {
    try {
      const result = await authenticateWithWebAuthn(settings.webAuthnCredentials || []);
      
      if (result.success && result.credentialId) {
        // Met à jour la date de dernière utilisation
        const updatedCredentials = updateCredentialLastUsed(
          settings.webAuthnCredentials || [],
          result.credentialId
        );
        saveSettings({ webAuthnCredentials: updatedCredentials });
        
        // Log d'audit
        addAuditLog('2fa_success', {
          success: true,
        });
        
        setShow2FAPrompt(false);
        
        // Si TOTP est également activé, on demande le code
        if (settings.totpEnabled && settings.totpSecret) {
          setShowTOTPPrompt(true);
        } else {
          completeUnlock();
        }
      } else {
        throw new Error('Échec de l\'authentification 2FA');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      addAuditLog('2fa_failed', {
        success: false,
        errorMessage: error.message || 'Erreur inconnue',
      });
      
      setShow2FAPrompt(false);
      lock(); // Reverrouille le coffre
      
      alert(`❌ Authentification 2FA échouée: ${error.message || 'Erreur inconnue'}`);
    }
  };
  
  /**
   * Vérifie le code TOTP
   */
  const handleTOTPVerification = async () => {
    if (!totpCode || totpCode.length !== 6) {
      alert('⚠️ Le code doit contenir 6 chiffres');
      return;
    }

    if (!settings.totpSecret) {
      alert('❌ TOTP non configuré');
      setShowTOTPPrompt(false);
      lock();
      return;
    }

    try {
      const isValid = await verifyTOTPCode(settings.totpSecret, totpCode);

      if (isValid) {
        addAuditLog('2fa_success', {
          success: true,
        });

        setShowTOTPPrompt(false);
        setTotpCode('');
        completeUnlock();
      } else {
        throw new Error('Code TOTP invalide');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      addAuditLog('2fa_failed', {
        success: false,
        errorMessage: error.message || 'Erreur inconnue',
      });

      setShowTOTPPrompt(false);
      setTotpCode('');
      lock();

      alert(`❌ Code TOTP invalide: ${error.message || 'Erreur inconnue'}`);
    }
  };
  
  /**
   * Complète le déverrouillage après vérifications
   */
  const completeUnlock = () => {
    setPassphrase('');
    setAttemptCount(0);
    setIsLocked(false);
    setLockoutTime(null);
    setShow2FAPrompt(false);
    isFirstLoadRef.current = true; // Réinitialiser pour charger depuis le backend
    
    // Log d'audit
    addAuditLog('vault_unlock', {
      success: true,
      userAgent: navigator.userAgent,
    });
    
    // Notifie le parent du changement d'état
    if (onUnlockChange) {
      onUnlockChange(true);
    }
    
    // Afficher l'avertissement de récupération si pas encore montré
    const hasShownBefore = localStorage.getItem('vault-recovery-warning-shown');
    if (!hasShownBefore && !hasShownWarning) {
      setShowRecoveryWarning(true);
      setHasShownWarning(true);
    }
  };

  /**
   * Gère l'ajout ou la modification d'une entrée
   */
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEntryId) {
        // Mode édition
        await updateEntry({ id: editingEntryId, ...newEntry });
        
        addAuditLog('entry_update', {
          entryId: editingEntryId,
          entryName: newEntry.name,
          success: true,
        });
      } else {
        // Mode ajout
        await addEntry(newEntry);
        
        addAuditLog('entry_create', {
          entryName: newEntry.name,
          success: true,
        });
      }
      
      setShowAddForm(false);
      setEditingEntryId(null);
      setNewEntry({
        type: 'password',
        name: '',
        data: {},
      });
    } catch (err) {
      console.error('Erreur:', err);
      
      const logType = editingEntryId ? 'entry_update' : 'entry_create';
      addAuditLog(logType, {
        entryId: editingEntryId || undefined,
        entryName: newEntry.name,
        success: false,
        errorMessage: String(err),
      });
    }
  };

  /**
   * Gère la modification d'une entrée
   */
  const handleUpdateEntry = async (id: string, updatedData: Partial<CreateEntryParams>) => {
    const entry = entries.find(e => e.id === id);
    try {
      await updateEntry({ id, ...updatedData });
      addAuditLog('entry_update', {
        entryId: id,
        entryName: entry?.name,
        success: true,
      });
    } catch (err) {
      console.error('Erreur:', err);
      addAuditLog('entry_update', {
        entryId: id,
        entryName: entry?.name,
        success: false,
        errorMessage: String(err),
      });
    }
  };

  /**
   * Gère la suppression d'une entrée
   */
  const handleDeleteEntry = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) {
      try {
        await deleteEntry(id);
        
        // Log d'audit
        addAuditLog('entry_delete', {
          entryId: id,
          entryName: entry?.name,
          success: true,
        });
      } catch (err) {
        addAuditLog('entry_delete', {
          entryId: id,
          entryName: entry?.name,
          success: false,
          errorMessage: String(err),
        });
      }
    }
  };

  /**
   * Met à jour les données de la nouvelle entrée
   */
  const updateNewEntryData = (field: string, value: string) => {
    setNewEntry((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value,
      },
    }));
  };

  const openEditEntryModal = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      setNewEntry({
        type: entry.type,
        name: entry.name,
        data: entry.data,
        meta: entry.meta,
        folderId: entry.folderId,
        tags: entry.tags,
      });
      setEditingEntryId(entryId);
      setShowAddForm(true);
    }
  };

  /**
   * Bascule la visibilité d'un mot de passe
   */
  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /**
   * Copie un mot de passe dans le presse-papiers
   */
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      
      // Efface l'indicateur après 2 secondes
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error('Erreur de copie:', err);
    }
  };

  /**
   * Filtre et trie les entrées selon les critères
   */
  const getFilteredAndSortedEntries = () => {
    let filtered = [...entries];
    
    // Filtre par dossier courant
    filtered = filtered.filter(entry => {
      const entryFolder = entryFolders[entry.id] ?? null;
      return entryFolder === currentFolderId;
    });
    
    // Filtre par recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => {
        const nameMatch = entry.name.toLowerCase().includes(search);
        const usernameMatch = entry.data.username?.toLowerCase().includes(search);
        const urlMatch = entry.meta?.url?.toLowerCase().includes(search);
        return nameMatch || usernameMatch || urlMatch;
      });
    }
    
    // Filtre par type
    if (filterType !== 'all') {
      filtered = filtered.filter(entry => entry.type === filterType);
    }
    
    // Filtre par tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(entry => {
        const entryTags = entry.tags || [];
        return selectedTags.every(tag => entryTags.includes(tag));
      });
    }
    
    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    
    return filtered;
  };
  /*
   * ============================================================================
   * FONCTIONS EXPORT/IMPORT - DÉSACTIVÉES (Gérées par CustomTitleBar)
   * Conservées ici pour référence / réactivation future si nécessaire
   * ============================================================================
   */
  
  /*
  /**
   * Exporte le coffre chiffré en JSON
   *\/
  const handleExport = async () => {
    try {
      // Récupère les données chiffrées depuis localStorage
      const vaultDataStr = localStorage.getItem('vault_data');
      if (!vaultDataStr) {
        throw new Error('Aucune donnée à exporter');
      }
      
      const entries = JSON.parse(vaultDataStr);
      
      // Crée un blob JSON
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        salt: localStorage.getItem('vault_salt'),
        entries: entries,
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Télécharge le fichier
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Log d'audit
      addAuditLog('export_data', {
        success: true,
      });
      
      alert('✅ Coffre exporté avec succès !');
    } catch (err) {
      console.error('Erreur d\'export:', err);
      alert('❌ Erreur lors de l\'export du coffre');
      
      addAuditLog('export_data', {
        success: false,
        errorMessage: String(err),
      });
    }
  };

  /**
   * Importe un coffre depuis différents formats
   *\/
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const format = detectImportFormat(file.name, text);
      
      if (format === 'vault-json') {
        // Import natif du coffre
        await handleNativeVaultImport(text);
      } else if (format === 'kaspersky-txt') {
        // Import depuis Kaspersky TXT
        await handleKasperskyImport(text, 'txt');
      } else if (format === 'kaspersky-csv') {
        // Import depuis Kaspersky CSV
        await handleKasperskyImport(text, 'csv');
      } else if (format === 'generic-csv') {
        // Import depuis CSV générique
        await handleGenericCSVImport(text);
      } else {
        throw new Error('Format de fichier non reconnu. Formats supportés : JSON (coffre natif), TXT/CSV (Kaspersky), CSV générique.');
      }
    } catch (err) {
      console.error('Erreur d\'import:', err);
      alert('❌ Erreur lors de l\'import : ' + (err as Error).message);
    }
    
    // Réinitialise l'input
    e.target.value = '';
  };

  /**
   * Import natif du format JSON du coffre
   *\/
  const handleNativeVaultImport = async (text: string) => {
    const importData = JSON.parse(text);
    
    // Valide la structure
    if (!importData.version || !importData.salt || !importData.entries) {
      throw new Error('Format de fichier JSON invalide');
    }
    
    const confirmed = window.confirm(
      `⚠️ Importer ce coffre remplacera toutes les données actuelles.\n` +
      `Date d'export: ${new Date(importData.exportDate).toLocaleDateString('fr-FR')}\n` +
      `Nombre d'entrées: ${importData.entries.length}\n\n` +
      `Voulez-vous continuer ?`
    );
    
    if (!confirmed) return;
    
    // Stocke le nouveau salt
    localStorage.setItem('vault_salt', importData.salt);
    
    // Stocke les entrées directement dans localStorage
    localStorage.setItem('vault_data', JSON.stringify(importData.entries));
    
    // Log d'audit
    addAuditLog('import_data', {
      success: true,
    });
    
    alert('✅ Coffre importé avec succès ! Veuillez déverrouiller avec la passphrase d\'origine.');
    lock();
  };

  /**
   * Import depuis Kaspersky Password Manager
   *\/
  const handleKasperskyImport = async (text: string, format: 'txt' | 'csv') => {
    // Parse les entrées
    const parsedEntries = format === 'txt' 
      ? parseKasperskyTXT(text) 
      : parseKasperskyCSV(text);
    
    if (parsedEntries.length === 0) {
      throw new Error('Aucune entrée valide trouvée dans le fichier Kaspersky');
    }
    
    const confirmed = window.confirm(
      `📥 Import depuis Kaspersky Password Manager\n\n` +
      `${parsedEntries.length} entrée(s) trouvée(s)\n\n` +
      `⚠️ Ces entrées seront ajoutées à votre coffre actuel.\n` +
      `Elles seront chiffrées avec votre passphrase actuelle.\n\n` +
      `Voulez-vous continuer ?`
    );
    
    if (!confirmed) return;
    
    // Vérifie que le coffre est déverrouillé
    if (!isUnlocked) {
      throw new Error('Veuillez d\'abord déverrouiller le coffre');
    }
    
    // Ajoute chaque entrée
    let successCount = 0;
    let errorCount = 0;
    
    for (const entry of parsedEntries) {
      try {
        await addEntry(entry);
        successCount++;
      } catch (err) {
        console.error('Erreur lors de l\'ajout de l\'entrée:', err);
        errorCount++;
      }
    }
    
    // Log d'audit
    addAuditLog('import_data', {
      success: true,
    });
    
    alert(
      `✅ Import terminé !\n\n` +
      `✓ ${successCount} entrée(s) importée(s)\n` +
      (errorCount > 0 ? `✗ ${errorCount} erreur(s)` : '')
    );
  };

  /**
   * Import depuis un CSV générique
   *\/
  const handleGenericCSVImport = async (text: string) => {
    const parsedEntries = parseGenericCSV(text);
    
    if (parsedEntries.length === 0) {
      throw new Error('Aucune entrée valide trouvée dans le fichier CSV');
    }
    
    const confirmed = window.confirm(
      `📥 Import depuis CSV\n\n` +
      `${parsedEntries.length} entrée(s) trouvée(s)\n\n` +
      `⚠️ Ces entrées seront ajoutées à votre coffre actuel.\n\n` +
      `Voulez-vous continuer ?`
    );
    
    if (!confirmed) return;
    
    if (!isUnlocked) {
      throw new Error('Veuillez d\'abord déverrouiller le coffre');
    }
    
    let successCount = 0;
    for (const entry of parsedEntries) {
      try {
        await addEntry(entry);
        successCount++;
      } catch (err) {
        console.error('Erreur:', err);
      }
    }
    
    alert(`✅ ${successCount} entrée(s) importée(s) avec succès !`);
    
    // Log d'audit
    addAuditLog('import_data', {
      success: true,
    });
  };
  */

  /**
   * Détecte et affiche les doublons
   * useCallback pour capturer les entries à jour dans les listeners IPC
   */
  const handleDetectDuplicates = useCallback(() => {
    console.log(`🔍 Détection de doublons... (${entries.length} entrées)`);
    const result = detectDuplicates(entries);
    
    if (result.totalDuplicates === 0) {
      alert('✅ Aucun doublon détecté !');
    } else {
      setShowDuplicateCleaner(true);
    }
  }, [entries]);

  /**
   * Gère le verrouillage du coffre
   */
  const handleLock = useCallback(() => {
    addAuditLog('vault_lock', {
      success: true,
    });
    lock();
    
    // Notifie le parent du changement d'état
    if (onUnlockChange) {
      onUnlockChange(false);
    }
  }, [lock, onUnlockChange]);

  /**
   * Calcule les statistiques détaillées
   */
  const getDetailedStats = () => {
    const stats = {
      total: entries.length,
      passwords: entries.filter(e => e.type === 'password').length,
      wallets: entries.filter(e => e.type === 'wallet').length,
      notes: entries.filter(e => e.type === 'note').length,
      privateKeys: entries.filter(e => e.type === 'privateKey').length,
      documents: entries.filter(e => e.type === 'document').length,
      blockchains: {} as Record<string, number>,
      walletTypes: {} as Record<string, number>,
    };

    // Compte les wallets par blockchain
    entries.forEach(entry => {
      if (entry.type === 'wallet' && entry.meta?.blockchain) {
        const blockchain = entry.meta.blockchain;
        stats.blockchains[blockchain] = (stats.blockchains[blockchain] || 0) + 1;
      }
      if (entry.type === 'wallet' && entry.meta?.walletType) {
        const walletType = entry.meta.walletType;
        stats.walletTypes[walletType] = (stats.walletTypes[walletType] || 0) + 1;
      }
    });

    return stats;
  };

  /**
   * Gère la sélection d'entrées pour l'export
   */
  const toggleEntrySelection = (id: string) => {
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /**
   * Sélectionne ou désélectionne toutes les entrées affichées
   */
  const toggleSelectAll = () => {
    const filtered = getFilteredAndSortedEntries();
    if (selectedEntries.size === filtered.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filtered.map(e => e.id)));
    }
  };

  /**
   * Exporte les entrées sélectionnées
   */
  const handleExportSelected = async () => {
    if (selectedEntries.size === 0) {
      alert('⚠️ Aucune entrée sélectionnée');
      return;
    }

    try {
      const vaultDataStr = localStorage.getItem('vault_data');
      if (!vaultDataStr) throw new Error('Aucune donnée trouvée');
      
      const allEntries = JSON.parse(vaultDataStr);
      
      // Filtre uniquement les entrées sélectionnées
      const selectedData = allEntries.filter((e: { id: string }) => selectedEntries.has(e.id));
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        salt: localStorage.getItem('vault_salt'),
        entries: selectedData,
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-selection-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`✅ ${selectedEntries.size} entrée(s) exportée(s) avec succès !`);
      setExportMode(false);
      setSelectedEntries(new Set());
    } catch (err) {
      console.error('Erreur d\'export:', err);
      alert('❌ Erreur lors de l\'export');
    }
  };

  /**
   * Gère l'upload de fichier pour les documents
   */
  const handleFileUpload = async (file: File) => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    
    if (file.size > MAX_FILE_SIZE) {
      alert('❌ Fichier trop volumineux. Taille maximale : 5 MB');
      return;
    }

    try {
      setUploadProgress(10);
      
      // Lecture du fichier
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        setUploadProgress(50);
        
        // Détection du type de fichier
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        let fileType: 'pdf' | 'image' | 'excel' | 'word' | 'other' = 'other';
        
        if (fileExtension === 'pdf') fileType = 'pdf';
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension)) fileType = 'image';
        else if (['xls', 'xlsx', 'csv'].includes(fileExtension)) fileType = 'excel';
        else if (['doc', 'docx', 'txt', 'rtf'].includes(fileExtension)) fileType = 'word';
        
        // Met à jour l'entrée avec les données du document
        setNewEntry((prev) => ({
          ...prev,
          data: {
            ...prev.data,
            document: base64Data,
          },
          meta: {
            ...prev.meta,
            fileName: file.name,
            fileSize: file.size,
            fileType: fileType,
          },
        }));
        
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(0), 1000);
      };
      
      reader.onerror = () => {
        alert('❌ Erreur lors de la lecture du fichier');
        setUploadProgress(0);
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erreur d\'upload:', err);
      alert('❌ Erreur lors de l\'upload du fichier');
      setUploadProgress(0);
    }
  };

  /**
   * Gère le drag & drop de fichiers
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  /**
   * Télécharge un document déchiffré
   */
  const handleDownloadDocument = (entry: typeof entries[0]) => {
    if (!entry.data.document) return;
    
    try {
      // Crée un lien de téléchargement
      const link = document.createElement('a');
      link.href = entry.data.document;
      link.download = entry.meta?.fileName || entry.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('✅ Document téléchargé avec succès !');
    } catch (err) {
      console.error('Erreur de téléchargement:', err);
      alert('❌ Erreur lors du téléchargement');
    }
  };

  /**
   * Obtient l'icône selon le type de fichier
   */
  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case 'pdf': return '📄';
      case 'image': return '🖼️';
      case 'excel': return '📊';
      case 'word': return '📝';
      default: return '📎';
    }
  };

  /**
   * Formate la taille du fichier
   */
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // ============================================================================
  // GESTION DES DOSSIERS ET TAGS
  // ============================================================================

  /**
   * Crée un nouveau dossier
   */
  const handleCreateFolder = () => {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name: folderForm.name || 'Nouveau dossier',
      parentId: currentFolderId,
      color: folderForm.color,
      icon: folderForm.icon,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setFolders([...folders, newFolder]);
    setFolderForm({ name: '', color: '#3b82f6', icon: '📁' });
    setShowFolderModal(false);
    
    // Log d'audit
    addAuditLog('folder_create', {
      folderId: newFolder.id,
      folderName: newFolder.name,
      success: true,
    });
  };

  /**
   * Modifie un dossier existant
   */
  const handleUpdateFolder = () => {
    if (!editingFolder) return;
    
    setFolders(folders.map(f => 
      f.id === editingFolder.id 
        ? { ...f, name: folderForm.name, color: folderForm.color, icon: folderForm.icon, updatedAt: new Date().toISOString() }
        : f
    ));
    
    setEditingFolder(null);
    setFolderForm({ name: '', color: '#3b82f6', icon: '📁' });
    setShowFolderModal(false);
    
    // Log d'audit
    addAuditLog('folder_update', {
      folderId: editingFolder.id,
      folderName: folderForm.name,
      success: true,
    });
  };

  /**
   * Supprime un dossier (déplace les entrées vers la racine)
   */
  const handleDeleteFolder = (folderId: string) => {
    if (!confirm('Supprimer ce dossier ? Les entrées seront déplacées vers la racine.')) return;
    
    // Déplace les entrées et sous-dossiers vers la racine
    setFolders(folders.filter(f => f.id !== folderId).map(f => 
      f.parentId === folderId ? { ...f, parentId: null } : f
    ));
    
    if (currentFolderId === folderId) {
      setCurrentFolderId(null);
    }
    
    // Log d'audit
    const folder = folders.find(f => f.id === folderId);
    addAuditLog('folder_delete', {
      folderId,
      folderName: folder?.name,
      success: true,
    });
  };

  /**
   * Ouvre le modal de création de dossier
   */
  const openCreateFolderModal = () => {
    setEditingFolder(null);
    setFolderForm({ name: '', color: '#3b82f6', icon: '📁' });
    setShowFolderModal(true);
  };

  /**
   * Ouvre le modal d'édition de dossier
   */
  const openEditFolderModal = (folder: Folder) => {
    setEditingFolder(folder);
    setFolderForm({ name: folder.name, color: folder.color || '#3b82f6', icon: folder.icon || '📁' });
    setShowFolderModal(true);
  };

  /**
   * Obtient le chemin complet d'un dossier (breadcrumb)
   */
  const getFolderPath = (folderId: string | null): Folder[] => {
    if (!folderId) return [];
    
    const path: Folder[] = [];
    let current = folders.find(f => f.id === folderId);
    
    while (current) {
      path.unshift(current);
      current = current.parentId ? folders.find(f => f.id === current?.parentId) : undefined;
    }
    
    return path;
  };

  /**
   * Obtient les sous-dossiers d'un dossier
   */
  const getSubfolders = (parentId: string | null): Folder[] => {
    return folders.filter(f => f.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name));
  };

  /**
   * Gère le drag & drop d'entrée vers dossier
   * À implémenter: utiliser handleEntryDragStart sur les cartes d'entrées
   * pour permettre le drag & drop des entrées vers les dossiers
   */
  const handleEntryDragStart = (entryId: string) => {
    isDraggingRef.current = true;
    setDraggedEntry(entryId);
  };

  const handleFolderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFolderDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedEntry) {
      // Mise à jour optimiste de l'état local
      setEntryFolders(prev => ({
        ...prev,
        [draggedEntry]: targetFolderId
      }));
      
      // Sauvegarde dans le backend
      const entry = entries.find(e => e.id === draggedEntry);
      if (entry) {
        try {
          await updateEntry({
            id: entry.id,
            name: entry.name,
            type: entry.type,
            data: entry.data,
            meta: entry.meta,
            folderId: targetFolderId,
            tags: (entry as unknown as { tags?: string[] }).tags || [],
          });
          
          const folderName = targetFolderId 
            ? folders.find(f => f.id === targetFolderId)?.name 
            : 'Racine';
          console.log(`✅ Entrée "${entry.name}" déplacée et sauvegardée vers: ${folderName}`);
          
          // Log d'audit
          addAuditLog('entry_update', {
            entryId: entry.id,
            entryName: entry.name,
            folderId: targetFolderId ?? undefined,
            folderName,
            success: true,
          });
        } catch (error) {
          console.error('❌ Erreur lors de la sauvegarde:', error);
          // Rollback en cas d'erreur
          setEntryFolders(prev => {
            const newState = { ...prev };
            const originalEntry = entries.find(e => e.id === draggedEntry);
            const typedOriginal = originalEntry as unknown as { folderId?: string | null };
            newState[draggedEntry] = typedOriginal?.folderId ?? null;
            return newState;
          });
        } finally {
          isDraggingRef.current = false;
        }
      }
      setDraggedEntry(null);
    }
    
    if (draggedFolder && draggedFolder !== targetFolderId) {
      // Déplace le dossier
      const folder = folders.find(f => f.id === draggedFolder);
      if (folder && !isParentFolder(draggedFolder, targetFolderId)) {
        setFolders(folders.map(f => 
          f.id === draggedFolder 
            ? { ...f, parentId: targetFolderId, updatedAt: new Date().toISOString() }
            : f
        ));
      }
      setDraggedFolder(null);
    }
  };

  /**
   * Vérifie si un dossier est parent d'un autre (évite boucles)
   */
  const isParentFolder = (parentId: string, childId: string | null): boolean => {
    if (!childId) return false;
    let current = folders.find(f => f.id === childId);
    while (current) {
      if (current.id === parentId) return true;
      current = current.parentId ? folders.find(f => f.id === current?.parentId) : undefined;
    }
    return false;
  };

  /**
   * Gère l'ajout de tags
   */
  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !allTags.includes(trimmed)) {
      setAllTags([...allTags, trimmed]);
    }
    setNewTag('');
    setShowTagInput(false);
  };

  /**
   * Bascule un tag dans le filtre
   */
  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  /**
   * Obtient tous les tags uniques des entrées
   */
  const extractAllTags = () => {
    const tags = new Set<string>();
    entries.forEach(entry => {
      entry.tags?.forEach(tag => tags.add(tag));
    });
    setAllTags(Array.from(tags).sort());
  };

  // Extrait les tags au chargement des entrées
  useEffect(() => {
    if (entries.length > 0) {
      extractAllTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  // Sauvegarde les folders dans localStorage à chaque modification
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vault-folders', JSON.stringify(folders));
    }
  }, [folders]);

  // Écoute les événements IPC du menu et des raccourcis clavier
  useEffect(() => {
    if (!window.electronAPI) return;

    // Handlers uniques (pas de re-création)
    const lockHandler = () => handleLock();
    
    // EXPORT ET IMPORT DÉSACÉTIVÉS - Gérés directement dans CustomTitleBar
    // const exportHandler = () => handleExport();
    // const importHandler = () => { ... };
    
    const duplicatesHandler = () => handleDetectDuplicates();
    const exportSelectiveHandler = () => {
      setExportMode(prev => {
        const newMode = !prev;
        if (prev) setSelectedEntries(new Set());
        return newMode;
      });
    };
    const aboutHandler = (message: string) => alert(message);

    // Enregistre les listeners une seule fois
    window.electronAPI.vault.onLock(lockHandler);
    // window.electronAPI.vault.onExport(exportHandler); // Désactivé
    // window.electronAPI.vault.onImport(importHandler); // Désactivé
    window.electronAPI.vault.onManageDuplicates(duplicatesHandler);
    window.electronAPI.vault.onExportSelective(exportSelectiveHandler);
    window.electronAPI.vault.onAbout(aboutHandler);
    
    // Nettoyage des listeners au démontage du composant (évite les doubles appels)
    return () => {
      console.log('🧹 Nettoyage des listeners IPC...');
      window.electronAPI.vault.removeLockListener(lockHandler);
      // window.electronAPI.vault.removeExportListener(exportHandler); // Désactivé
      // window.electronAPI.vault.removeImportListener(importHandler); // Désactivé
      window.electronAPI.vault.removeManageDuplicatesListener(duplicatesHandler);
      window.electronAPI.vault.removeExportSelectiveListener(exportSelectiveHandler);
      window.electronAPI.vault.removeAboutListener(aboutHandler);
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, handleDetectDuplicates]); // Ajout de handleDetectDuplicates dans les dépendances

  // Initialise entryFolders à partir des entrées existantes (fusion intelligente)
  useEffect(() => {
    if (entries.length === 0) return;
    
    if (!isDraggingRef.current) {
      // Au premier chargement, on prend les valeurs du backend (qui ont été sauvegardées)
      if (isFirstLoadRef.current) {
        const backendFolders: Record<string, string | null> = {};
        entries.forEach(entry => {
          const typedEntry = entry as unknown as { folderId?: string | null };
          backendFolders[entry.id] = typedEntry.folderId ?? null;
        });
        setEntryFolders(backendFolders);
        isFirstLoadRef.current = false;
      } else {
        // Pour les chargements ultérieurs, on fusionne intelligemment
        setEntryFolders(prev => {
          const merged: Record<string, string | null> = { ...prev };
          
          // Ajoute les nouvelles entrées qui n'ont pas encore de mapping
          entries.forEach(entry => {
            if (!(entry.id in merged)) {
              const typedEntry = entry as unknown as { folderId?: string | null };
              merged[entry.id] = typedEntry.folderId ?? null;
            }
          });
          
          // Supprime les mappings des entrées qui n'existent plus
          const entryIds = new Set(entries.map(e => e.id));
          Object.keys(merged).forEach(id => {
            if (!entryIds.has(id)) {
              delete merged[id];
            }
          });
          
          return merged;
        });
      }
    }
  }, [entries]);

  // Traite automatiquement les imports en attente quand le coffre est déverrouillé
  useEffect(() => {
    if (!isUnlocked) return;

    const processPendingImport = async () => {
      const pendingData = sessionStorage.getItem('pending_import');
      if (!pendingData) return;

      try {
        const importData = JSON.parse(pendingData);
        const entries = importData.entries || importData; // Support ancien format
        
        if (!Array.isArray(entries) || entries.length === 0) return;

        console.log(`📥 Import automatique de ${entries.length} entrée(s)...`);

        let successCount = 0;
        let errorCount = 0;

        for (const entry of entries) {
          try {
            await addEntry(entry);
            successCount++;
          } catch (err) {
            console.error('Erreur lors de l\'ajout de l\'entrée:', err);
            errorCount++;
          }
        }

        // Nettoie sessionStorage
        sessionStorage.removeItem('pending_import');

        // Log d'audit
        addAuditLog('import_auto', {
          success: true,
          count: successCount,
          errors: errorCount,
        });

        // Notification
        if (successCount > 0) {
          alert(
            `✅ Import automatique terminé !\n\n` +
            `✓ ${successCount} entrée(s) importée(s)\n` +
            (errorCount > 0 ? `✗ ${errorCount} erreur(s)` : '')
          );
        }
      } catch (err) {
        console.error('Erreur lors de l\'import automatique:', err);
      }
    };

    // Exécute au déverrouillage
    processPendingImport();

    // Écoute aussi l'événement personnalisé du CustomTitleBar
    const handlePendingImport = () => {
      setTimeout(processPendingImport, 100);
    };
    
    window.addEventListener('pending-import', handlePendingImport);
    
    return () => {
      window.removeEventListener('pending-import', handlePendingImport);
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked]);

  // Écran de déverrouillage
  if (!isUnlocked) {
    return (
      <div className="vault-container">
        <div className="vault-unlock-card">
          <h1 className="vault-title">🔒 Coffre Numérique Sécurisé</h1>
          <p className="vault-subtitle">
            Entrez votre passphrase maître pour déverrouiller votre coffre
          </p>
          <form onSubmit={handleUnlock} className="vault-unlock-form">
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase maître"
              className="vault-input-unlock"
              required
            />
            <button type="submit" className="vault-btn vault-btn-primary" disabled={loading || isLocked}>
              {loading ? 'Déverrouillage...' : isLocked ? '🔒 Verrouillé' : 'Déverrouiller'}
            </button>
          </form>
          {error && <p className="vault-error">{error}</p>}
          {attemptCount > 0 && !isLocked && (
            <p className="vault-warning-text">
              ⚠️ Tentatives: {attemptCount}/{MAX_ATTEMPTS}
            </p>
          )}
          {isLocked && lockoutTime && (
            <p className="vault-error-text">
              🔒 Verrouillé jusqu&apos;à {lockoutTime.toLocaleTimeString('fr-FR')}
            </p>
          )}
          <div className="vault-unlock-actions">
            <button
              type="button"
              onClick={() => setShowPasswordRecovery(true)}
              className="vault-btn vault-btn-secondary"
            >
              🔓 Mot de passe oublié ?
            </button>  
            {/* Bouton de réinitialisation complète du coffre           
            <button
              type="button"
              onClick={() => {
                if (confirm('⚠️ Réinitialiser complètement le coffre ?\n\nToutes les données seront DÉFINITIVEMENT supprimées.\n\nCette action est IRRÉVERSIBLE !')) {
                  if (confirm('❗ DERNIÈRE CONFIRMATION\n\nÊtes-vous absolument sûr(e) de vouloir supprimer toutes les données ?')) {
                    localStorage.clear(); // Supprime TOUT le localStorage
                    window.location.reload(); // Recharge l'application
                  }
                }
              }}
              className="vault-btn vault-btn-danger"
              style={{ fontSize: '13px' }}
            >
              🔧 Réinitialiser le coffre
            </button>
            */}

          </div>
          {passphraseHint && (
            <div className="vault-passphrase-hint">
              <p className='vault-hint-text'>
                💡 <strong>Indice :</strong> {passphraseHint}
              </p>
            </div>
          )}
        </div>
        
        {/* Modal de récupération du mot de passe */}
        {showPasswordRecovery && (
          <div className="vault-modal-overlay">
            <PasswordRecovery
              onBack={() => setShowPasswordRecovery(false)}
              onRecoverySuccess={(newPassphrase) => {
                setPassphrase(newPassphrase);
                setShowPasswordRecovery(false);
                alert('✅ Passphrase réinitialisée. Vous pouvez maintenant vous connecter.');
              }}
              passphraseHint={passphraseHint}
            />
          </div>
        )}
      </div>
    );
  }

  // Tableau de bord principal
  return (
    <div className="vault-container">
      <h1 className="vault-title">🔓 Coffre Numérique Sécurisé</h1>
      <div className="vault-header">
        <div className="vault-header-actions">
          <button 
            onClick={() => setShowPasswordGenerator(!showPasswordGenerator)} 
            className={`vault-actions-btn-generate ${showPasswordGenerator ? 'vault-actions-btn-active' : 'vault-actions-btn-inactive'}`}
          >
            <span className="vault-btn-emoji">🎲</span>
            <span className="vault-btn-text"> Générateur</span>
          </button>
          <button 
            onClick={() => {
              if (!showSecuritySettings) {
                setSecuritySettingsTab('autolock'); // Réinitialise à l'onglet par défaut
              }
              setShowSecuritySettings(!showSecuritySettings);
            }} 
            className={`vault-actions-btn-security ${showSecuritySettings ? 'vault-actions-btn-active' : 'vault-actions-btn-inactive'}`}
          >
            <span className="vault-btn-emoji">⚙️</span>
            <span className="vault-btn-text"> Sécurité</span>
          </button>
          <button 
            onClick={() => setShowStats(!showStats)} 
            className={`vault-actions-btn-stats ${showStats ? 'vault-actions-btn-active' : 'vault-actions-btn-inactive'}`}
          >
            <span className="vault-btn-emoji">📊</span>
            <span className="vault-btn-text"> Statistiques</span>
          </button>
          <button onClick={handleDetectDuplicates} className="vault-actions-btn">
            <span className="vault-btn-emoji">🔍</span>
            <span className="vault-btn-text"> Doublons</span>
          </button>
          <button 
            onClick={() => {
              setExportMode(!exportMode);
              if (exportMode) setSelectedEntries(new Set());
            }} 
            className={`vault-actions-btn ${exportMode ? 'vault-btn-primary' : 'vault-btn-secondary'}`}
          >
            {exportMode ? (
              <>
                <span className="vault-btn-emoji">✅</span>
                <span className="vault-btn-text"> Mode Export</span>
              </>
            ) : (
              <>
                <span className="vault-btn-emoji">📋</span>
                <span className="vault-btn-text"> Export Sélectif</span>
              </>
            )}
          </button>

          {/* Exporter tout et Importer sont des actions critiques, on les rend plus visibles 
          <button onClick={handleExport} className="vault-actions-btn vault-btn-secondary">
            <span className="vault-btn-emoji">📥</span>
            <span className="vault-btn-text"> Exporter Tout</span>
          </button>
          <label className="vault-actions-btn vault-btn-secondary vault-import-label">
            <span className="vault-btn-emoji">📤</span>
            <span className="vault-btn-text"> Importer</span>
            <input
              type="file"
              accept=".json,.txt,.csv,.xml"
              onChange={handleImport}
              className="vault-hidden-input"
            />
          </label>
            */}

          <button onClick={handleLock} className="vault-actions-btn vault-btn-secondary">
            <span className="vault-btn-emoji">🔒</span>
            <span className="vault-btn-text"> Verrouiller</span>
          </button>
        </div>
      </div>

      {error && <p className="vault-error">{error}</p>}
      
      {showPasswordGenerator && <PasswordGenerator />}
      
      {showSecuritySettings && <SecuritySettings initialTab={securitySettingsTab} />}
      
      {/* Modal d'avertissement de sauvegarde des codes de récupération */}
      {showRecoveryWarning && (
        <RecoveryWarningModal
          onConfirm={() => {
            setShowRecoveryWarning(false);
            localStorage.setItem('vault-recovery-warning-shown', 'true');
          }}
          onGenerateCodes={() => {
            setShowRecoveryWarning(false);
            setSecuritySettingsTab('recovery'); // Ouvre l'onglet Récupération
            setShowSecuritySettings(true);
            localStorage.setItem('vault-recovery-warning-shown', 'true');
          }}
          hasRecoveryCodes={settings.recoveryCodesGenerated}
        />
      )}
      
      {/* Prompt 2FA lors du déverrouillage */}
      {show2FAPrompt && (
        <div className="vault-modal-overlay">
          <div className="vault-modal">
            <h3>🔐 Authentification à deux facteurs</h3>
            <p>Veuillez vous authentifier avec votre biométrie ou clé de sécurité.</p>
            <div className="vault-2fa-waiting">
              <div className="vault-2fa-icon">⏳</div>
              <p>En attente de votre authentification...</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Prompt TOTP lors du déverrouillage */}
      {showTOTPPrompt && (
        <div className="vault-modal-overlay">
          <div className="vault-modal">
            {/* {console.log('🎯 Modal TOTP affiché')} */}
            <h3>📱 Code d&apos;Authentification</h3>
            <p>Entrez le code à 6 chiffres de votre application d&apos;authentification :</p>
            <input
              type="text"
              value={totpCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setTotpCode(value);
              }}
              placeholder="123456"
              className="vault-input"
              maxLength={6}
              autoComplete="off"
              autoFocus
            />
            <div className='vault-modal-actions'>
              <button
                onClick={handleTOTPVerification}
                disabled={totpCode.length !== 6}
                className="vault-btn vault-btn-primary"
              >
                ✅ Vérifier
              </button>
              <button
                onClick={() => {
                  setShowTOTPPrompt(false);
                  setTotpCode('');
                  lock();
                }}
                className="vault-btn vault-btn-secondary"
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation par dossiers */}
      <div className="vault-folder-navigation">
        {/* Breadcrumb */}
        <div 
          className="vault-breadcrumb"
          onDragOver={(e) => handleFolderDragOver(e)}
          onDrop={(e) => handleFolderDrop(e, null)}
        >
          <button 
            onClick={() => setCurrentFolderId(null)}
            className={`vault-breadcrumb-item ${!currentFolderId ? 'active' : ''}`}
          >
            🏠 Racine
          </button>
          {getFolderPath(currentFolderId).map(folder => (
            <div key={folder.id} className="vault-breadcrumb-item">
              <span className="vault-breadcrumb-separator">/</span>
              <button onClick={() => setCurrentFolderId(folder.id)}>
                {folder.icon} {folder.name}
              </button>
            </div>
          ))}
        </div>

        {/* Actions dossier */}
        <div className="vault-folder-actions">
          <button onClick={openCreateFolderModal} className="vault-btn vault-btn-sm vault-btn-secondary">
            📁+ Nouveau dossier
          </button>
        </div>
      </div>

      {/* Liste des sous-dossiers */}
      {getSubfolders(currentFolderId).length > 0 && (
        <div className="vault-folders-list">
          {getSubfolders(currentFolderId).map(folder => (
            <div 
              key={folder.id}
              className={`vault-folder-item ${draggedEntry && 'drag-target'}`}
              draggable
              onDragStart={() => setDraggedFolder(folder.id)}
              onDragOver={(e) => handleFolderDragOver(e)}
              onDrop={(e) => handleFolderDrop(e, folder.id)}
              onDragEnd={() => setDraggedFolder(null)}
              data-folder-color={folder.color}
            >
              <button 
                onClick={() => setCurrentFolderId(folder.id)}
                className="vault-folder-button"
              >
                <span className="vault-folder-icon">{folder.icon}</span>
                <span className="vault-folder-name">{folder.name}</span>
                <span className="vault-folder-count">
                  {Object.values(entryFolders).filter(fId => fId === folder.id).length} entrées
                </span>
              </button>
              <div className="vault-folder-item-actions">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditFolderModal(folder);
                  }}
                  className="vault-btn vault-btn-icon"
                  title="Éditer"
                >
                  ✏️
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id);
                  }}
                  className="vault-btn vault-btn-icon"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div className="vault-search-filters">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, username, URL..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="vault-search-input"
          aria-label="Rechercher dans le coffre"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as VaultEntryType | 'all')}
          className="vault-filter-select"
          aria-label="Filtrer par type"
        >
          <option value="all">Tous les types</option>
          <option value="password">🔑 Mots de passe</option>
          <option value="wallet">🏦 Wallets Web3</option>
          <option value="note">📝 Notes</option>
          <option value="privateKey">🔐 Clés privées</option>
          <option value="document">📄 Documents</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'type')}
          className="vault-filter-select"
          aria-label="Trier par"
        >
          <option value="date">📅 Date</option>
          <option value="name">🔤 Nom</option>
          <option value="type">📂 Type</option>
        </select>
      </div>

      {/* Filtres par tags */}
      {allTags.length > 0 && (
        <div className="vault-tags-filter">
          <div className="vault-tags-filter-header">
            <span className="vault-tags-filter-label">🏷️ Filtrer par tags:</span>
            <button 
              onClick={() => setShowTagInput(!showTagInput)}
              className="vault-btn vault-btn-sm vault-btn-secondary"
            >
              + Nouveau tag
            </button>
          </div>
          <div className="vault-tags-list">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTagFilter(tag)}
                className={`vault-tag ${selectedTags.includes(tag) ? 'vault-tag-selected' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
          {showTagInput && (
            <div className="vault-tag-input-wrapper">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Nom du tag..."
                className="vault-tag-input"
                autoFocus
              />
              <button onClick={handleAddTag} className="vault-btn vault-btn-sm vault-btn-primary">
                Ajouter
              </button>
              <button onClick={() => setShowTagInput(false)} className="vault-btn vault-btn-sm vault-btn-secondary">
                Annuler
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Statistiques détaillées */}
      {showStats && (
        <div className="vault-stats-panel">
          <h3 className="vault-stats-title">📊 Statistiques Détaillées</h3>
          <div className="vault-stats-grid">
            <div className="vault-stat-card">
              <div className="vault-stat-icon">🔑</div>
              <div className="vault-stat-content">
                <div className="vault-stat-value">{getDetailedStats().passwords}</div>
                <div className="vault-stat-label">Mots de passe</div>
              </div>
            </div>
            
            <div className="vault-stat-card vault-stat-highlight">
              <div className="vault-stat-icon">🏦</div>
              <div className="vault-stat-content">
                <div className="vault-stat-value">{getDetailedStats().wallets}</div>
                <div className="vault-stat-label">Wallets Web3</div>
              </div>
            </div>
            
            <div className="vault-stat-card">
              <div className="vault-stat-icon">📝</div>
              <div className="vault-stat-content">
                <div className="vault-stat-value">{getDetailedStats().notes}</div>
                <div className="vault-stat-label">Notes</div>
              </div>
            </div>
            
            <div className="vault-stat-card">
              <div className="vault-stat-icon">🔐</div>
              <div className="vault-stat-content">
                <div className="vault-stat-value">{getDetailedStats().privateKeys}</div>
                <div className="vault-stat-label">Clés privées</div>
              </div>
            </div>
          </div>
          
          {getDetailedStats().wallets > 0 && (
            <div className="vault-blockchain-stats">
              <h4 className="vault-blockchain-title">⛓️ Répartition par Blockchain</h4>
              <div className="vault-blockchain-grid">
                {Object.entries(getDetailedStats().blockchains)
                  .sort(([, a], [, b]) => b - a)
                  .map(([blockchain, count]) => (
                    <div key={blockchain} className="vault-blockchain-item">
                      <span className="vault-blockchain-name">{blockchain}</span>
                      <span className="vault-blockchain-count">{count}</span>
                    </div>
                  ))}
              </div>
              
              <h4 className="vault-blockchain-title">🔥 Types de Wallets</h4>
              <div className="vault-blockchain-grid">
                {Object.entries(getDetailedStats().walletTypes).map(([type, count]) => (
                  <div key={type} className="vault-blockchain-item">
                    <span className="vault-blockchain-name">
                      {type === 'hot' && '🔥 Hot Wallet'}
                      {type === 'cold' && '❄️ Cold Wallet'}
                      {type === 'hardware' && '🔒 Hardware Wallet'}
                    </span>
                    <span className="vault-blockchain-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Mode export sélectif */}
      {exportMode && (
        <div className="vault-export-panel">
          <div className="vault-export-header">
            <h3>📋 Export Sélectif - {selectedEntries.size} entrée(s) sélectionnée(s)</h3>
            <div className="vault-export-actions">
              <button onClick={toggleSelectAll} className="vault-btn vault-btn-secondary vault-btn-small">
                {selectedEntries.size === getFilteredAndSortedEntries().length ? '❌ Tout désélectionner' : '✅ Tout sélectionner'}
              </button>
              <button 
                onClick={handleExportSelected} 
                className="vault-btn vault-btn-primary vault-btn-small"
                disabled={selectedEntries.size === 0}
              >
                📥 Exporter la sélection
              </button>
              <button 
                onClick={() => {
                  setExportMode(false);
                  setSelectedEntries(new Set());
                }} 
                className="vault-btn vault-btn-danger vault-btn-small"
              >
                ✖️ Annuler
              </button>
            </div>
          </div>
          <p className="vault-export-hint">💡 Cliquez sur les entrées ci-dessous pour les sélectionner</p>
        </div>
      )}
      
      {/*}
      <div className="vault-stats-display">
        📊 <strong>{getFilteredAndSortedEntries().length} / {entries.length} entrée(s)</strong> affichée(s)
      </div>
      */}

      <div className="vault-actions">
        <button
          onClick={() => {
            if (showAddForm) {
              setShowAddForm(false);
              setEditingEntryId(null);
              setNewEntry({
                type: 'password',
                name: '',
                data: {},
              });
            } else {
              setEditingEntryId(null);
              setNewEntry({
                type: 'password',
                name: '',
                data: {},
              });
              setShowAddForm(true);
            }
          }}
          className="vault-btn vault-btn-primary"
        >
          {showAddForm ? 'Annuler' : '+ Ajouter une entrée'}
        </button>
      </div>

      {showAddForm && (
        <div className="vault-add-form-card">
          <h2 className="vault-form-title">{editingEntryId ? '✏️ Modifier l\'entrée' : '➕ Nouvelle entrée'}</h2>
          <form onSubmit={handleAddEntry} className="vault-add-form">
            <div className="vault-form-group">
              <label htmlFor="entry-type">Type</label>
              <select
                id="entry-type"
                value={newEntry.type}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, type: e.target.value as VaultEntryType })
                }
                className="vault-input"
                aria-label="Type d'entrée"
              >
                <option value="password">🔑 Mot de passe</option>
                <option value="note">📝 Note sécurisée</option>
                <option value="privateKey">🔐 Clé privée</option>
                <option value="wallet">🏦 Wallet Web3</option>
                <option value="document">📄 Document</option>
              </select>
            </div>

            <div className="vault-form-group">
              <label>Nom</label>
              <input
                type="text"
                value={newEntry.name}
                onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                placeholder="Ex: Mon compte Gmail"
                className="vault-input"
                required
              />
            </div>

            {newEntry.type === 'password' && (
              <>
                <div className="vault-form-group">
                  <label>Nom d&apos;utilisateur</label>
                  <input
                    type="text"
                    value={newEntry.data.username || ''}
                    onChange={(e) => updateNewEntryData('username', e.target.value)}
                    placeholder="Nom d'utilisateur"
                    className="vault-input"
                  />
                </div>
                <div className="vault-form-group">
                  <label>Mot de passe</label>
                  <input
                    type="password"
                    value={newEntry.data.password || ''}
                    onChange={(e) => updateNewEntryData('password', e.target.value)}
                    placeholder="Mot de passe"
                    className="vault-input"
                    required
                  />
                </div>
              </>
            )}

            {newEntry.type === 'note' && (
              <div className="vault-form-group">
                <label>Contenu</label>
                <textarea
                  value={newEntry.data.content || ''}
                  onChange={(e) => updateNewEntryData('content', e.target.value)}
                  placeholder="Contenu de la note"
                  className="vault-textarea"
                  rows={5}
                  required
                />
              </div>
            )}

            {newEntry.type === 'privateKey' && (
              <div className="vault-form-group">
                <label>Clé privée</label>
                <textarea
                  value={newEntry.data.privateKey || ''}
                  onChange={(e) => updateNewEntryData('privateKey', e.target.value)}
                  placeholder="Collez votre clé privée ici"
                  className="vault-textarea"
                  rows={5}
                  required
                />
              </div>
            )}

            {newEntry.type === 'document' && (
              <>
                <div className="vault-form-group">
                  <label>Catégorie</label>
                  <select
                    value={newEntry.meta?.category || 'Autre'}
                    onChange={(e) =>
                      setNewEntry({
                        ...newEntry,
                        meta: { ...newEntry.meta, category: e.target.value },
                      })
                    }
                    className="vault-input"
                    aria-label="Catégorie du document"
                  >
                    <option value="Contrats">📜 Contrats</option>
                    <option value="Identité">🪪 Identité</option>
                    <option value="Médical">🏥 Médical</option>
                    <option value="Financier">💰 Financier</option>
                    <option value="Autre">📁 Autre</option>
                  </select>
                </div>

                <div className="vault-form-group">
                  <label>Description (optionnel)</label>
                  <textarea
                    value={newEntry.data.content || ''}
                    onChange={(e) => updateNewEntryData('content', e.target.value)}
                    placeholder="Description ou notes sur ce document"
                    className="vault-textarea"
                    rows={3}
                  />
                </div>

                <div className="vault-form-group">
                  <label>Fichier</label>
                  <div
                    className={`vault-dropzone ${isDragging ? 'vault-dropzone-active' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {!newEntry.data.document ? (
                      <>
                        <div className="vault-dropzone-icon">📎</div>
                        <p className="vault-dropzone-text">
                          Glissez-déposez un fichier ici
                        </p>
                        <p className="vault-dropzone-subtext">ou</p>
                        <label className="vault-btn vault-btn-secondary vault-btn-small">
                          📂 Parcourir
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file);
                            }}
                            className="vault-hidden-input"
                          />
                        </label>
                        <p className="vault-dropzone-hint">
                          Formats : PDF, Images, Word, Excel (max 5 MB)
                        </p>
                      </>
                    ) : (
                      <div className="vault-file-preview">
                        <div className="vault-file-icon">
                          {getFileIcon(newEntry.meta?.fileType)}
                        </div>
                        <div className="vault-file-info">
                          <p className="vault-file-name">{newEntry.meta?.fileName}</p>
                          <p className="vault-file-size">{formatFileSize(newEntry.meta?.fileSize)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewEntry((prev) => ({
                              ...prev,
                              data: { ...prev.data, document: undefined },
                              meta: {
                                ...prev.meta,
                                fileName: undefined,
                                fileSize: undefined,
                                fileType: undefined,
                              },
                            }));
                          }}
                          className="vault-btn vault-btn-danger vault-btn-small"
                        >
                          ✖️ Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="vault-upload-progress">
                      <div
                        className="vault-upload-progress-bar"
                        data-progress={uploadProgress}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {newEntry.type === 'wallet' && (
              <>
                <div className="vault-form-group">
                  <label>Type de Wallet</label>
                  <select
                    value={newEntry.meta?.walletType || 'hot'}
                    onChange={(e) =>
                      setNewEntry({
                        ...newEntry,
                        meta: { ...newEntry.meta, walletType: e.target.value as 'hot' | 'cold' | 'hardware' },
                      })
                    }
                    className="vault-input"
                    aria-label="Type de wallet"
                  >
                    <option value="hot">🔥 Hot Wallet (MetaMask, Trust Wallet)</option>
                    <option value="cold">❄️ Cold Wallet (Paper Wallet)</option>
                    <option value="hardware">🔒 Hardware Wallet (Ledger, Trezor)</option>
                  </select>
                </div>

                <div className="vault-form-group">
                  <label>Nom du Wallet</label>
                  <input
                    type="text"
                    value={newEntry.data.walletName || ''}
                    onChange={(e) => updateNewEntryData('walletName', e.target.value)}
                    placeholder="Ex: MetaMask Principal, Ledger Nano X"
                    className="vault-input"
                    required
                  />
                </div>

                <div className="vault-form-group">
                  <label>Blockchain</label>
                  <select
                    value={newEntry.meta?.blockchain || 'Ethereum'}
                    onChange={(e) =>
                      setNewEntry({
                        ...newEntry,
                        meta: { ...newEntry.meta, blockchain: e.target.value },
                      })
                    }
                    className="vault-input"
                    aria-label="Blockchain"
                  >
                    <option value="Ethereum">Ethereum (ETH)</option>
                    <option value="Bitcoin">Bitcoin (BTC)</option>
                    <option value="Solana">Solana (SOL)</option>
                    <option value="Polygon">Polygon (MATIC)</option>
                    <option value="BSC">Binance Smart Chain (BSC)</option>
                    <option value="Cosmos">Cosmos (ATOM)</option>
                    <option value="Avalanche">Avalanche (AVAX)</option>
                    <option value="Arbitrum">Arbitrum</option>
                    <option value="Optimism">Optimism</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div className="vault-form-group">
                  <label>Adresse Publique</label>
                  <input
                    type="text"
                    value={newEntry.meta?.publicAddress || ''}
                    onChange={(e) =>
                      setNewEntry({
                        ...newEntry,
                        meta: { ...newEntry.meta, publicAddress: e.target.value },
                      })
                    }
                    placeholder="0x... ou adresse Bitcoin, Solana, etc."
                    className="vault-input"
                  />
                </div>

                <div className="vault-form-group">
                  <label>🔒 Seed Phrase (12-24 mots) - ULTRA SENSIBLE</label>
                  <textarea
                    value={newEntry.data.seedPhrase || ''}
                    onChange={(e) => updateNewEntryData('seedPhrase', e.target.value)}
                    placeholder="word1 word2 word3 ... (12-24 mots séparés par des espaces)"
                    className="vault-textarea vault-critical-field"
                    rows={3}
                  />
                  <small className="vault-warning-text">
                    ⚠️ Ne partagez JAMAIS votre seed phrase ! Quiconque la possède contrôle vos fonds.
                  </small>
                </div>

                <div className="vault-form-group">
                  <label>Clé Privée (optionnel si seed phrase fournie)</label>
                  <textarea
                    value={newEntry.data.walletPrivateKey || ''}
                    onChange={(e) => updateNewEntryData('walletPrivateKey', e.target.value)}
                    placeholder="0x... ou clé privée format WIF"
                    className="vault-textarea vault-critical-field"
                    rows={2}
                  />
                </div>

                <div className="vault-form-group">
                  <label>Mot de Passe du Wallet (si applicable)</label>
                  <input
                    type="password"
                    value={newEntry.data.walletPassword || ''}
                    onChange={(e) => updateNewEntryData('walletPassword', e.target.value)}
                    placeholder="Mot de passe pour déverrouiller le wallet"
                    className="vault-input"
                  />
                </div>

                <div className="vault-form-group">
                  <label>PIN (pour hardware wallets)</label>
                  <input
                    type="password"
                    value={newEntry.data.pin || ''}
                    onChange={(e) => updateNewEntryData('pin', e.target.value)}
                    placeholder="Code PIN du hardware wallet"
                    className="vault-input"
                  />
                </div>
              </>
            )}

            <div className="vault-button-group">
              <button type="submit" className="vault-btn vault-btn-primary" disabled={loading}>
                {loading ? (editingEntryId ? 'Modification...' : 'Ajout...') : (editingEntryId ? '💾 Modifier' : '➕ Ajouter')}
              </button>
              {editingEntryId && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingEntryId(null);
                    setNewEntry({
                      type: 'password',
                      name: '',
                      data: {},
                    });
                  }}
                  className="vault-btn vault-btn-secondary"
                >
                  ❌ Annuler
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="vault-entries-list">
        <h2 className="vault-section-title">
          Vos entrées ({entries.length})
        </h2>

        {loading && <p className="vault-loading">Chargement...</p>}

        {!loading && getFilteredAndSortedEntries().length === 0 && entries.length > 0 && (
          <p className="vault-empty">Aucun résultat ne correspond à vos critères de recherche.</p>
        )}

        {!loading && entries.length === 0 && (
          <p className="vault-empty">Aucune entrée. Ajoutez-en une pour commencer !</p>
        )}

        {getFilteredAndSortedEntries().map((entry) => (
          <div 
            key={entry.id} 
            className={`vault-entry-card ${exportMode && selectedEntries.has(entry.id) ? 'vault-entry-selected' : ''} ${exportMode ? 'vault-entry-selectable' : ''} ${draggedEntry === entry.id ? 'dragging' : ''}`}
            onClick={() => exportMode && toggleEntrySelection(entry.id)}
            draggable={!exportMode}
            onDragStart={() => handleEntryDragStart(entry.id)}
            onDragEnd={() => setDraggedEntry(null)}
          >
            <div className="vault-entry-header">
              <div>
                {exportMode && (
                  <input
                    type="checkbox"
                    checked={selectedEntries.has(entry.id)}
                    onChange={() => toggleEntrySelection(entry.id)}
                    className="vault-entry-checkbox"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Sélectionner ${entry.name}`}
                  />
                )}
                <span className={`vault-entry-type vault-entry-type-${entry.type}`}>
                  {entry.type === 'password' && '🔑'}
                  {entry.type === 'note' && '📝'}
                  {entry.type === 'privateKey' && '🔐'}
                  {entry.type === 'wallet' && '🏦'}
                  {entry.type === 'document' && '📄'}
                  {' '}
                  {entry.type === 'wallet' ? 'Wallet Web3' : entry.type}
                </span>
                {entry.type === 'wallet' && entry.meta?.blockchain && (
                  <span className="vault-entry-blockchain-badge">{entry.meta.blockchain}</span>
                )}
              </div>
              <button
                onClick={() => handleDeleteEntry(entry.id)}
                className="vault-delete-entry-btn"
              >
                🗑️ Supprimer
              </button>
            </div>
            <h3 className="vault-entry-name">{entry.name}</h3>

            <div className="vault-entry-data">
              {entry.type === 'password' && (
                <>
                  <p>
                    <div className="vault-entry-url">
                      <strong>Utilisateur:</strong> {entry.data.username || 'N/A'}
                    </div>
                  </p>
                  <p className="vault-password-display">
                    <strong>Mot de passe:</strong> 
                    <span className="vault-password-value">
                      {visiblePasswords.has(entry.id) ? entry.data.password : '••••••••••••••••••••••••'}
                    </span>

                    {/* Boutons pour modifier l'entrée */}
                    <button
                      onClick={() => openEditEntryModal(entry.id)}
                      className="vault-password-edit-icon"
                      title="Éditer"
                    >
                      ✏️
                    </button>
                    {/* Boutons afficher/cacher et copier */}
                    <button
                      onClick={() => togglePasswordVisibility(entry.id)}
                      className="vault-password-toggle-icon"
                    >
                      {visiblePasswords.has(entry.id) ? '🙈' : '👁️'}
                    </button>
                    

                    {/* Icône afficher/cacher le mot de passe 
                    <svg
                      xmlns="https://www.w3.org/TR/SVG/"
                      width="16"
                      height="16"
                      color='yellow'
                      fill="currentColor" 
                      cursor={"pointer"}                     
                      viewBox="0 0 16 16"
                      onClick={() => togglePasswordVisibility(entry.id)}
                      className="vault-password-toggle-icon"
                    >
                      {visiblePasswords.has(entry.id) ? (
                        // Icône "cacher"
                        <path d="M13.359 11.238l1.4 1.4c-1.5 1.3-3.4 2.1-5.8 2.1-4.4 0-7.9-3.6-8-3.7l1.4-1.4c.1.1 3.1 2.7 6.6 2.7 1.5 0 2.9-.5 4-1.3zM2.808 3.172l1.4 1.4C3.9 5.1 2.9 6.3 2.3 7c-.4-.5-.7-1-.9-1.3C2.4 5.1 2.7 4.2 2.8 3.2zM14.7 1.3l-1.4 1.4c.5.6.9 1.3 1.2 1.7-.4.5-.7 1-.9 1.3-.5-.6-1-1.2-1.5-1.6l-1.4 1.4c.7.6 1.3 1.4 1.7 2-.4.5-.7 1-.9 1.3-.5-.6-1-1.2-1.5-1.6L7.9 11l-1.4 1.4c-.5-.6-1-1.2-1.5-1.6l-1.4 1.4c1 .9 2.3 1.5 3.7 1.5 4.4 0 7.9-3.6 8-3.7l-1.4-1.4c-.1.1-3.1-2.7-6.6-2.7-1.5 0-2.9.5-4 1.3l-1.4-1.4c1-.9 2.3-1.5 3.7-1.5 2 .1 3.8 1 5 2.5l1.4-1.4c-.8-.9-2-1.7-3.3-2.2z"/>
                      ) : (
                        // Icône "voir"
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zm-8 4a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
                      )}
                    </svg>
                    */}
                    {/* Icône copier dans le presse-papiers 
                    <button
                      onClick={() => copyToClipboard(entry.data.password || '', entry.id)}
                      className="vault-btn vault-btn-secondary vault-btn-small vault-button-fixed-width"
                    >
                      {copiedId === entry.id ? '✅' : '📋'}
                    </button>     
                    */}  
                    {/* Icône copier dans le presse-papiers */}
                    <svg
                      xmlns="https://www.w3.org/TR/SVG/"
                      width="16"
                      height="16"
                      color='green'
                      fill="currentColor"
                      cursor={"pointer"}
                      viewBox="0 0 16 16"
                      onClick={() => copyToClipboard(entry.data.password || '', entry.id)}
                      className="vault-password-copy-icon"
                    >
                      {copiedId === entry.id ? (
                        // Icône "copié"
                        <path d="M16 2a2 2 0 0 1-2 2H6.414l3.293 3.293-1.414 1.414L2 3.414V14a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      ) : (
                        // Icône "copier"
                        <path d="M10 1.5A1.5 1.5 0 0 1 11.5 3v10A1.5 1.5 0 0 1 10 14.5H4A1.5 1.5 0 0 1 2.5 13V3A1.5 1.5 0 0 1 4 1.5h6zm0 1H4A.5.5 0 0 0 3.5 3v10a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5V3a.5.5 0 0 0-.5-.5zM12.5 4A1.5 1.5 0 0 1 14 5.5v8A1.5 1.5 0 0 1 12.5 15h-8A1.5 1.5 0 0 1 3 13.5v-8A1.5 1.5 0 0 1 4.5 4h8zm0 1h-8A.5.5 0 0 0 4 5.5v8a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5z"/>
                      )}
                    </svg>
                  </p>
                </>
              )}
              {entry.type === 'note' && (
                <>
                  <p className="vault-entry-content">
                    {visiblePasswords.has(entry.id) 
                      ? entry.data.content 
                      : entry.data.content?.substring(0, 100) + '...'}
                  </p>
                  <div className="vault-button-group">
                    <button
                      onClick={() => togglePasswordVisibility(entry.id)}
                      className="vault-btn vault-btn-secondary vault-btn-small"
                    >
                      {visiblePasswords.has(entry.id) ? '🙈 Réduire' : '👁️ Voir tout'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(entry.data.content || '', entry.id)}
                      className="vault-btn vault-btn-secondary vault-btn-small"
                    >
                      {copiedId === entry.id ? '✅ Copié' : '📋 Copier'}
                    </button>
                  </div>
                </>
              )}
              {entry.type === 'privateKey' && (
                <>
                  <p className="vault-entry-content">
                    {visiblePasswords.has(entry.id) 
                      ? entry.data.privateKey 
                      : 'Clé privée (cachée)'}
                  </p>
                  <div className="vault-button-group">
                    <button
                      onClick={() => togglePasswordVisibility(entry.id)}
                      className="vault-btn vault-btn-secondary vault-btn-small"
                    >
                      {visiblePasswords.has(entry.id) ? '🙈 Cacher' : '👁️ Voir'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(entry.data.privateKey || '', entry.id)}
                      className="vault-btn vault-btn-secondary vault-btn-small"
                    >
                      {copiedId === entry.id ? '✅ Copié' : '📋 Copier'}
                    </button>
                  </div>
                </>
              )}

              {entry.type === 'document' && (
                <>
                  <div className="vault-document-info">
                    <div className="vault-document-header">
                      <div className="vault-document-icon-large">
                        {getFileIcon(entry.meta?.fileType)}
                      </div>
                      <div className="vault-document-details">
                        <p className="vault-document-filename">{entry.meta?.fileName || 'Document'}</p>
                        <p className="vault-document-meta">
                          <span className="vault-document-category">{entry.meta?.category || 'Autre'}</span>
                          {' • '}
                          <span className="vault-document-size">{formatFileSize(entry.meta?.fileSize)}</span>
                        </p>
                      </div>
                    </div>
                    
                    {entry.data.content && (
                      <div className="vault-document-description">
                        <strong>Description :</strong> {entry.data.content}
                      </div>
                    )}

                    {/* Prévisualisation pour les images */}
                    {entry.meta?.fileType === 'image' && entry.data.document && (
                      <div className="vault-document-preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.data.document}
                          alt={entry.meta?.fileName || 'Document image'}
                          className="vault-document-preview-image"
                          onClick={() => {
                            const img = new Image();
                            img.src = entry.data.document || '';
                            const win = window.open('');
                            win?.document.write(img.outerHTML);
                          }}
                        />
                        <p className="vault-document-preview-hint">Cliquez pour agrandir</p>
                      </div>
                    )}

                    <div className="vault-button-group">
                      <button
                        onClick={() => handleDownloadDocument(entry)}
                        className="vault-btn vault-btn-primary vault-btn-small"
                      >
                        📥 Télécharger
                      </button>
                      {entry.meta?.fileType === 'pdf' && entry.data.document && (
                        <button
                          onClick={() => {
                            const win = window.open('');
                            win?.document.write(`<iframe width='100%' height='100%' src='${entry.data.document}'></iframe>`);
                          }}
                          className="vault-btn vault-btn-secondary vault-btn-small"
                        >
                          👁️ Prévisualiser
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {entry.type === 'wallet' && (
                <>
                  <div className="wallet-info-grid">
                    <div className="wallet-info-item">
                      <strong>Type:</strong>
                      <span className={`wallet-type-badge wallet-type-${entry.meta?.walletType || 'hot'}`}>
                        {entry.meta?.walletType === 'hot' && '🔥 Hot Wallet'}
                        {entry.meta?.walletType === 'cold' && '❄️ Cold Wallet'}
                        {entry.meta?.walletType === 'hardware' && '🔒 Hardware Wallet'}
                      </span>
                    </div>

                    <div className="wallet-info-item">
                      <strong>Wallet:</strong> {entry.data.walletName || 'N/A'}
                    </div>

                    <div className="wallet-info-item">
                      <strong>Blockchain:</strong>
                      <span className="wallet-blockchain-badge">
                        {entry.meta?.blockchain || 'N/A'}
                      </span>
                    </div>

                    {entry.meta?.publicAddress && (
                      <div className="wallet-info-item wallet-info-full-width">
                        <strong>Adresse:</strong>
                        <code className="wallet-address">{entry.meta.publicAddress}</code>
                        <button
                          onClick={() => copyToClipboard(entry.meta?.publicAddress || '', entry.id + '-addr')}
                          className="vault-btn vault-btn-secondary vault-btn-small"
                        >
                          {copiedId === entry.id + '-addr' ? '✅' : '📋'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Seed Phrase - ULTRA SENSIBLE */}
                  {entry.data.seedPhrase && (
                    <div className="wallet-critical-section">
                      <p className="wallet-critical-label">
                        🔒 <strong>Seed Phrase (12-24 mots)</strong>
                      </p>
                      <p className="wallet-critical-content">
                        {visiblePasswords.has(entry.id + '-seed') 
                          ? entry.data.seedPhrase 
                          : '••••••••••••••••••••••••••••••••••••'}
                      </p>
                      <div className="vault-button-group">
                        <button
                          onClick={() => {
                            if (!visiblePasswords.has(entry.id + '-seed')) {
                              if (confirm('⚠️ ATTENTION: Vous allez afficher votre seed phrase.\n\nQuiconque la possède peut contrôler vos fonds.\n\nÊtes-vous dans un endroit sûr ?')) {
                                togglePasswordVisibility(entry.id + '-seed');
                              }
                            } else {
                              togglePasswordVisibility(entry.id + '-seed');
                            }
                          }}
                          className="vault-btn vault-btn-danger vault-btn-small"
                        >
                          {visiblePasswords.has(entry.id + '-seed') ? '🙈 Cacher' : '👁️ Voir'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('⚠️ Copier la seed phrase dans le presse-papiers ?')) {
                              copyToClipboard(entry.data.seedPhrase || '', entry.id + '-seed-copy');
                            }
                          }}
                          className="vault-btn vault-btn-danger vault-btn-small"
                        >
                          {copiedId === entry.id + '-seed-copy' ? '✅ Copié' : '📋 Copier'}
                        </button>
                      </div>
                      <small className="wallet-warning">
                        ⚠️ Ne partagez JAMAIS votre seed phrase avec qui que ce soit !
                      </small>
                    </div>
                  )}

                  {/* Clé Privée */}
                  {entry.data.walletPrivateKey && (
                    <div className="wallet-critical-section">
                      <p className="wallet-critical-label">
                        🔑 <strong>Clé Privée</strong>
                      </p>
                      <p className="wallet-critical-content">
                        {visiblePasswords.has(entry.id + '-pk') 
                          ? entry.data.walletPrivateKey 
                          : '••••••••••••••••••••••••••••••••••••'}
                      </p>
                      <div className="vault-button-group">
                        <button
                          onClick={() => togglePasswordVisibility(entry.id + '-pk')}
                          className="vault-btn vault-btn-danger vault-btn-small"
                        >
                          {visiblePasswords.has(entry.id + '-pk') ? '🙈 Cacher' : '👁️ Voir'}
                        </button>
                        <button
                          onClick={() => copyToClipboard(entry.data.walletPrivateKey || '', entry.id + '-pk-copy')}
                          className="vault-btn vault-btn-danger vault-btn-small"
                        >
                          {copiedId === entry.id + '-pk-copy' ? '✅ Copié' : '📋 Copier'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mot de passe du wallet */}
                  {entry.data.walletPassword && (
                    <div className="wallet-info-section">
                      <p className="vault-password-display">
                        <strong>Mot de passe:</strong>
                        <span className="vault-password-value">
                          {visiblePasswords.has(entry.id + '-pwd') ? entry.data.walletPassword : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(entry.id + '-pwd')}
                          className="vault-btn vault-btn-secondary vault-btn-small"
                        >
                          {visiblePasswords.has(entry.id + '-pwd') ? '🙈' : '👁️'}
                        </button>
                        <button
                          onClick={() => copyToClipboard(entry.data.walletPassword || '', entry.id + '-pwd-copy')}
                          className="vault-btn vault-btn-secondary vault-btn-small"
                        >
                          {copiedId === entry.id + '-pwd-copy' ? '✅' : '📋'}
                        </button>
                      </p>
                    </div>
                  )}

                  {/* PIN hardware wallet */}
                  {entry.data.pin && (
                    <div className="wallet-info-section">
                      <p className="vault-password-display">
                        <strong>PIN:</strong>
                        <span className="vault-password-value">
                          {visiblePasswords.has(entry.id + '-pin') ? entry.data.pin : '••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(entry.id + '-pin')}
                          className="vault-btn vault-btn-secondary vault-btn-small"
                        >
                          {visiblePasswords.has(entry.id + '-pin') ? '🙈' : '👁️'}
                        </button>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="vault-entry-meta">
              <small>Créé le: {new Date(entry.createdAt).toLocaleDateString('fr-FR')}</small>
            </div>
          </div>
        ))}
      </div>
      
      {/* Modal de nettoyage des doublons */}
      {showDuplicateCleaner && (
        <DuplicateCleaner
          entries={entries}
          onDelete={deleteEntry}
          onClose={() => setShowDuplicateCleaner(false)}
        />
      )}

      {/* Modal création/édition de dossier */}
      {showFolderModal && (
        <div className="vault-modal-overlay" onClick={() => setShowFolderModal(false)}>
          <div className="vault-modal vault-folder-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vault-modal-header">
              <h2>{editingFolder ? 'Éditer le dossier' : 'Nouveau dossier'}</h2>
              {/*
              <button 
                onClick={() => setShowFolderModal(false)}
                className="vault-modal-close-button"
              >
                ✕
              </button>
              */}
            </div>
            <div className="vault-modal-body">
              <div className="vault-form-group">
                <label htmlFor="folder-name">Nom du dossier</label>
                <input
                  id="folder-name"
                  type="text"
                  value={folderForm.name}
                  onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                  placeholder="Nom du dossier"
                  className="vault-input-form"
                  autoFocus
                />
              </div>
              <div className="vault-form-group">
                <label htmlFor="folder-icon">Icône</label>
                <div className="vault-icon-picker">
                  {['📁', '🔐', '💼', '🏠', '⚡', '🎯', '📊', '🌟', '🔥', '💎', '⛓️', '🧑‍💻', '🌍', '🎮', '🛠️', '👥', '🔗', '📱'].map(icon => (
                    <button
                      key={icon}
                      onClick={() => setFolderForm({ ...folderForm, icon })}
                      className={`vault-icon-option ${folderForm.icon === icon ? 'selected' : ''}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="vault-form-group">
                <label htmlFor="folder-color">Couleur</label>
                <div className="vault-color-picker">
                  {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#e11d48', '#14b8a6', '#d97706', '#a855f7', '#db2777', '#0891b2', ].map(color => (
                    <button
                      key={color}
                      onClick={() => setFolderForm({ ...folderForm, color })}
                      className={`vault-color-option ${folderForm.color === color ? 'selected' : ''}`}
                      data-color={color}
                      aria-label={`Couleur ${color}`}
                      title={`Couleur ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="vault-modal-footer">
              <button 
                onClick={() => setShowFolderModal(false)}
                className="vault-btn vault-btn-secondary"
              >
                Annuler
              </button>
              <button 
                onClick={editingFolder ? handleUpdateFolder : handleCreateFolder}
                className="vault-btn vault-btn-primary"
                disabled={!folderForm.name.trim()}
              >
                {editingFolder ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
