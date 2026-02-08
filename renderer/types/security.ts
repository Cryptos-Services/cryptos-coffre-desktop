/**
 * Types et interfaces pour les fonctionnalités de sécurité avancées
 */

/**
 * Type d'action dans le journal d'audit
 */
export type AuditActionType =
  | 'vault_unlock'
  | 'vault_lock'
  | 'entry_create'
  | 'entry_update'
  | 'entry_delete'
  | 'entry_view'
  | 'folder_create'
  | 'folder_update'
  | 'folder_delete'
  | 'export_data'
  | 'import_data'
  | 'import_pending'
  | 'import_auto'
  | '2fa_enable'
  | '2fa_disable'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_success'
  | '2fa_failed'
  | '2fa_credential_toggled'
  | 'recovery_codes_generate'
  | 'recovery_code_used'
  | 'password_recovery'
  | 'settings_update'
  | 'failed_login';

/**
 * Entrée du journal d'audit
 */
export interface AuditLogEntry {
  id: string;
  action: AuditActionType;
  timestamp: string;
  details?: {
    entryId?: string;
    entryName?: string;
    folderId?: string;
    folderName?: string;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
    reason?: string; // Pour vault_lock (auto-lock, manual, etc.)
    timeout?: number; // Délai d'auto-lock en minutes
    format?: string; // Pour import_pending (format de fichier)
    count?: number; // Pour import_pending/import_auto (nombre d'entrées)
    errors?: number; // Pour import_auto (nombre d'erreurs)
    credentialName?: string; // Pour 2fa_credential_toggled (nom du credential)
    enabled?: boolean; // Pour 2fa_credential_toggled (nouvel état enabled/disabled)
  };
}

/**
 * Code de récupération pour accès d'urgence
 */
export interface RecoveryCode {
  code: string;
  used: boolean;
  usedAt?: string;
}

/**
 * Clé de récupération chiffrée (permet de récupérer l'accès sans perdre les données)
 */
export interface EncryptedRecoveryKey {
  encryptedData: string; // Clé actuelle chiffrée avec les codes de récupération
  iv: string; // IV pour le déchiffrement
  salt: string; // Salt utilisé pour dériver la clé de protection depuis les codes
  createdAt: string; // Date de création
}

/**
 * Paramètres de sécurité configurables
 */
export interface SecuritySettings {
  // Auto-lock
  autoLockEnabled: boolean;
  autoLockTimeout: number; // en minutes
  
  // 2FA WebAuthn
  webAuthnEnabled: boolean;
  webAuthnCredentials?: WebAuthnCredential[];
  
  // Journal d'audit
  auditLogEnabled: boolean;
  auditLogRetention: number; // en jours
  
  // Protection brute-force
  maxLoginAttempts: number;
  lockoutDuration: number; // en minutes
  
  // TOTP 2FA
  totpEnabled?: boolean;
  totpSecret?: string;
  
  // Codes de récupération
  recoveryCodes: RecoveryCode[];
  recoveryCodesGenerated: boolean;
  encryptedRecoveryKey?: EncryptedRecoveryKey; // Clé chiffrée pour récupération sans perte
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Credential WebAuthn pour l'authentification 2FA
 */
export interface WebAuthnCredential {
  id: string;
  credentialId: string;
  publicKey: string;
  authenticatorType: 'platform' | 'cross-platform';
  aaguid?: string; // AAGUID de l'authenticator (permet d'identifier le modèle physique)
  name: string; // Nom donné par l'utilisateur (ex: "Touch ID MacBook")
  enabled?: boolean; // Si false, le credential est désactivé (default: true)
  createdAt: string;
  lastUsed: string;
}

/**
 * Session de déverrouillage avec informations de sécurité
 */
export interface VaultSession {
  id: string;
  unlockedAt: string;
  lastActivityAt: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Statistiques de sécurité
 */
export interface SecurityStats {
  totalLogins: number;
  failedLoginAttempts: number;
  lastSuccessfulLogin?: string;
  lastFailedLogin?: string;
  webAuthnCredentialsCount: number;
  unusedRecoveryCodesCount: number;
  auditLogEntriesCount: number;
}
