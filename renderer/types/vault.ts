/**
 * Types et interfaces pour le coffre numérique sécurisé
 */

/**
 * Types d'entrées supportées par le coffre
 */
export type VaultEntryType = 'password' | 'document' | 'privateKey' | 'note' | 'wallet';

/**
 * Dossier pour organiser les entrées
 */
export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null = racine
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Entrée individuelle dans le coffre
 */
export interface VaultEntry {
  id: string;
  type: VaultEntryType;
  name: string;
  encryptedData: string; // Données chiffrées côté client
  iv: string; // Vecteur d'initialisation pour le déchiffrement
  folderId: string | null; // null = racine
  tags: string[]; // Tags pour filtrage rapide
  meta?: {
    url?: string; // Pour les mots de passe
    username?: string;
    category?: string;
    fileType?: string; // Pour les documents
    fileName?: string;
    fileSize?: number;
    // Pour les wallets Web3
    walletType?: 'hot' | 'cold' | 'hardware';
    blockchain?: string;
    publicAddress?: string;
    lastBackup?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Structure d'un coffre utilisateur
 */
export interface Vault {
  id: string;
  userId: string;
  entries: VaultEntry[];
  folders: Folder[];
  passphraseHint?: string; // Indice pour se souvenir de la passphrase
  recoveryCodesBackupDate?: string; // Date de sauvegarde des codes
  createdAt: string;
  updatedAt: string;
}

/**
 * Données décryptées d'une entrée (côté client uniquement)
 */
export interface DecryptedEntry extends Omit<VaultEntry, 'encryptedData' | 'iv'> {
  data: {
    password?: string;
    username?: string;
    content?: string; // Pour les notes
    privateKey?: string;
    document?: string; // Base64 du document
    // Pour les wallets Web3
    walletName?: string;
    seedPhrase?: string; // 12-24 mots
    walletPrivateKey?: string;
    walletPassword?: string;
    pin?: string;
  };
}

/**
 * Paramètres de création d'une entrée
 */
export interface CreateEntryParams {
  type: VaultEntryType;
  name: string;
  data: {
    password?: string;
    username?: string;
    content?: string;
    privateKey?: string;
    document?: string;
    // Pour les wallets Web3
    walletName?: string;
    seedPhrase?: string;
    walletPrivateKey?: string;
    walletPassword?: string;
    pin?: string;
  };
  meta?: VaultEntry['meta'];
  folderId?: string | null;
  tags?: string[];
}

/**
 * Paramètres de mise à jour d'une entrée
 */
export interface UpdateEntryParams extends Partial<CreateEntryParams> {
  id: string;
}

/**
 * Clés de chiffrement dérivées (jamais stockées côté serveur)
 */
export interface DerivedKeys {
  encryptionKey: CryptoKey;
  salt: Uint8Array;
}

/**
 * Résultat d'une opération de chiffrement
 */
export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  salt?: string; // Optionnel, pour les clés de récupération
}

/**
 * Configuration du coffre
 */
export interface VaultConfig {
  iterations: number; // Pour PBKDF2
  keyLength: number;
  algorithm: string;
}
