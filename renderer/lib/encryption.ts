/**
 * Librairie de chiffrement pour le coffre numérique
 * Utilise l'API WebCrypto (natif navigateur) pour un chiffrement AES-GCM
 */

import { EncryptionResult, DerivedKeys, VaultConfig } from '../types/vault';

/**
 * Configuration par défaut du chiffrement
 */
const DEFAULT_CONFIG: VaultConfig = {
  iterations: 100000, // PBKDF2 iterations
  keyLength: 256,
  algorithm: 'AES-GCM',
};

/**
 * Convertit une chaîne en ArrayBuffer
 */
function stringToArrayBuffer(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convertit un ArrayBuffer en chaîne
 */
function arrayBufferToString(buffer: ArrayBuffer | Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Convertit un ArrayBuffer en base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convertit une chaîne base64 en ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Génère un salt aléatoire
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Génère un vecteur d'initialisation aléatoire
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Dérive une clé de chiffrement à partir d'une passphrase
 * @param passphrase - Passphrase maître de l'utilisateur
 * @param salt - Salt unique (doit être stocké pour dériver la même clé)
 * @returns Clé de chiffrement dérivée
 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const passphraseBuffer = stringToArrayBuffer(passphrase);

  // Import de la passphrase comme clé
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passphraseBuffer as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Dérivation de la clé avec PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: DEFAULT_CONFIG.iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: DEFAULT_CONFIG.algorithm, length: DEFAULT_CONFIG.keyLength },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Dérive les clés de chiffrement avec génération du salt
 * @param passphrase - Passphrase maître
 * @returns Clé de chiffrement et salt (à stocker)
 */
export async function deriveKeysWithSalt(passphrase: string): Promise<DerivedKeys> {
  const salt = generateSalt();
  const encryptionKey = await deriveKey(passphrase, salt);
  return { encryptionKey, salt };
}

/**
 * Chiffre des données avec AES-GCM
 * @param data - Données en clair
 * @param key - Clé de chiffrement
 * @returns Données chiffrées en base64 et IV
 */
export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<EncryptionResult> {
  const iv = generateIV();
  const dataBuffer = stringToArrayBuffer(data);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: DEFAULT_CONFIG.algorithm,
      iv: iv as BufferSource,
    },
    key,
    dataBuffer as BufferSource
  );

  return {
    encryptedData: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Déchiffre des données avec AES-GCM
 * @param encryptedData - Données chiffrées en base64
 * @param iv - Vecteur d'initialisation en base64
 * @param key - Clé de déchiffrement
 * @returns Données en clair
 */
export async function decrypt(
  encryptedData: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const encryptedBuffer = base64ToArrayBuffer(encryptedData);
  const ivBuffer = base64ToArrayBuffer(iv);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: DEFAULT_CONFIG.algorithm,
      iv: ivBuffer,
    },
    key,
    encryptedBuffer
  );

  return arrayBufferToString(decryptedBuffer);
}

/**
 * Vérifie si la passphrase est valide en essayant de déchiffrer une entrée
 * @param passphrase - Passphrase à vérifier
 * @param salt - Salt stocké
 * @param encryptedTestData - Donnée de test chiffrée
 * @param iv - IV de la donnée de test
 * @returns true si valide, false sinon
 */
export async function verifyPassphrase(
  passphrase: string,
  salt: Uint8Array,
  encryptedTestData: string,
  iv: string
): Promise<boolean> {
  try {
    const key = await deriveKey(passphrase, salt);
    await decrypt(encryptedTestData, iv, key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Chiffre la clé de récupération avec une clé dérivée des codes
 * @param recoveryKey - Clé de récupération à protéger (clé cryptographique actuelle)
 * @param recoveryCodes - Codes de récupération (utilisés pour dériver la clé de chiffrement)
 * @returns Clé chiffrée en base64 et IV
 */
/**
 * Chiffre la passphrase de récupération avec les codes de récupération
 * @param originalPassphrase - Passphrase maître originale à protéger
 * @param recoveryCodes - Codes de récupération
 * @returns Résultat du chiffrement (passphrase chiffrée + IV + salt)
 */
export async function encryptRecoveryKey(
  originalPassphrase: string,
  recoveryCodes: string[]
): Promise<EncryptionResult> {
  // Combine tous les codes pour créer une phrase secrète
  const combinedCodes = recoveryCodes.join('');
  const salt = generateSalt();
  
  // Dérive une clé depuis les codes combinés
  const protectionKey = await deriveKey(combinedCodes, salt);
  
  // Chiffre la passphrase originale (au lieu de la CryptoKey)
  const result = await encrypt(originalPassphrase, protectionKey);
  
  // Retourne le résultat avec le salt nécessaire pour la dérivation future
  return {
    encryptedData: result.encryptedData,
    iv: result.iv,
    salt: arrayBufferToBase64(salt),
  };
}

/**
 * Déchiffre la passphrase de récupération avec un code de récupération
 * @param encryptedPassphrase - Passphrase chiffrée
 * @param iv - Vecteur d'initialisation
 * @param salt - Salt utilisé pour la dérivation
 * @param recoveryCodes - Codes de récupération
 * @returns Passphrase originale déchiffrée
 */
export async function decryptRecoveryKey(
  encryptedPassphrase: string,
  iv: string,
  salt: string,
  recoveryCodes: string[]
): Promise<string> {
  // Combine tous les codes
  const combinedCodes = recoveryCodes.join('');
  const saltBuffer = base64ToArrayBuffer(salt);
  
  // Dérive la clé de protection depuis les codes
  const protectionKey = await deriveKey(combinedCodes, new Uint8Array(saltBuffer));
  
  // Déchiffre la passphrase originale
  const decryptedPassphrase = await decrypt(encryptedPassphrase, iv, protectionKey);
  
  return decryptedPassphrase;
}

/**
 * Évalue la force d'une passphrase
 * @param passphrase Passphrase à évaluer
 * @returns Objet avec score (0-100), niveau (weak/medium/strong/very-strong) et suggestions
 */
export function evaluatePassphraseStrength(passphrase: string): {
  score: number;
  level: 'weak' | 'medium' | 'strong' | 'very-strong';
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];

  // Longueur
  if (passphrase.length < 12) {
    suggestions.push('Utilisez au moins 12 caractères');
  } else if (passphrase.length >= 12 && passphrase.length < 16) {
    score += 20;
  } else if (passphrase.length >= 16 && passphrase.length < 20) {
    score += 30;
  } else {
    score += 40;
  }

  // Majuscules
  if (/[A-Z]/.test(passphrase)) {
    score += 15;
  } else {
    suggestions.push('Ajoutez des lettres majuscules');
  }

  // Minuscules
  if (/[a-z]/.test(passphrase)) {
    score += 15;
  } else {
    suggestions.push('Ajoutez des lettres minuscules');
  }

  // Chiffres
  if (/[0-9]/.test(passphrase)) {
    score += 15;
  } else {
    suggestions.push('Ajoutez des chiffres');
  }

  // Caractères spéciaux
  if (/[^A-Za-z0-9]/.test(passphrase)) {
    score += 15;
  } else {
    suggestions.push('Ajoutez des caractères spéciaux (!@#$%^&*)');
  }

  // Déterminer le niveau
  let level: 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score < 40) {
    level = 'weak';
  } else if (score < 60) {
    level = 'medium';
  } else if (score < 80) {
    level = 'strong';
  } else {
    level = 'very-strong';
  }

  return { score, level, suggestions };
}

/**
 * Génère une passphrase aléatoire sécurisée
 * @param length - Longueur de la passphrase
 * @returns Passphrase générée
 */
export function generateSecurePassphrase(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  let passphrase = '';
  for (let i = 0; i < length; i++) {
    passphrase += charset[randomValues[i] % charset.length];
  }
  return passphrase;
}

/**
 * Export du salt en base64 pour stockage
 */
export function saltToBase64(salt: Uint8Array): string {
  return arrayBufferToBase64(salt);
}

/**
 * Import du salt depuis base64
 */
export function base64ToSalt(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64));
}
