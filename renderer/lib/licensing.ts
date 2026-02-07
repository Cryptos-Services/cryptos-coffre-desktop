/**
 * Système de gestion des licences Cryptos Coffre Desktop
 * Gère la période d'essai et l'activation des licences
 */

export type LicenseStatus = 'trial' | 'active' | 'expired';

export interface LicenseInfo {
  status: LicenseStatus;
  trialStartDate: string | null; // ISO date
  trialDaysRemaining: number;
  licenseKey: string | null;
  licenseActivatedAt: string | null;
  isLicenseValid: boolean;
}

const TRIAL_DURATION_DAYS = 15;
const STORAGE_KEY_TRIAL_START = 'license_trial_start';
const STORAGE_KEY_LICENSE = 'license_key';
const STORAGE_KEY_LICENSE_ACTIVATED = 'license_activated_at';

/**
 * Initialise la période d'essai si c'est la première utilisation
 */
export function initializeTrial(): void {
  const existingTrialStart = localStorage.getItem(STORAGE_KEY_TRIAL_START);
  
  // Si aucune date d'essai n'existe, c'est la première utilisation
  if (!existingTrialStart) {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_TRIAL_START, now);
    console.log('🎁 Période d\'essai initialisée:', now);
  }
}

/**
 * Calcule le nombre de jours restants dans la période d'essai
 */
function calculateTrialDaysRemaining(): number {
  const trialStart = localStorage.getItem(STORAGE_KEY_TRIAL_START);
  if (!trialStart) return TRIAL_DURATION_DAYS;

  const startDate = new Date(trialStart);
  const now = new Date();
  const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = TRIAL_DURATION_DAYS - daysPassed;

  return Math.max(0, daysRemaining);
}

/**
 * Obtient les informations complètes sur la licence
 */
export function getLicenseInfo(): LicenseInfo {
  const trialStart = localStorage.getItem(STORAGE_KEY_TRIAL_START);
  const licenseKey = localStorage.getItem(STORAGE_KEY_LICENSE);
  const licenseActivatedAt = localStorage.getItem(STORAGE_KEY_LICENSE_ACTIVATED);
  const daysRemaining = calculateTrialDaysRemaining();

  // Si une licence valide existe
  if (licenseKey && licenseActivatedAt) {
    return {
      status: 'active',
      trialStartDate: trialStart,
      trialDaysRemaining: 0,
      licenseKey,
      licenseActivatedAt,
      isLicenseValid: true,
    };
  }

  // Période d'essai
  if (daysRemaining > 0) {
    return {
      status: 'trial',
      trialStartDate: trialStart,
      trialDaysRemaining: daysRemaining,
      licenseKey: null,
      licenseActivatedAt: null,
      isLicenseValid: false,
    };
  }

  // Essai expiré
  return {
    status: 'expired',
    trialStartDate: trialStart,
    trialDaysRemaining: 0,
    licenseKey: null,
    licenseActivatedAt: null,
    isLicenseValid: false,
  };
}

/**
 * Vérifie si l'application peut être utilisée
 */
export function canUseApp(): boolean {
  const info = getLicenseInfo();
  return info.status === 'trial' || info.status === 'active';
}

/**
 * Active une clé de licence
 */
export function activateLicense(licenseKey: string): { success: boolean; message: string } {
  // Validation basique de format (vous pouvez améliorer)
  if (!licenseKey || licenseKey.length < 20) {
    return {
      success: false,
      message: 'Clé de licence invalide (trop courte)',
    };
  }

  // Format attendu : CRYPT-XXXXX-XXXXX-XXXXX-XXXXX
  const regex = /^CRYPT-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
  if (!regex.test(licenseKey.toUpperCase())) {
    return {
      success: false,
      message: 'Format de clé invalide. Format attendu : CRYPT-XXXXX-XXXXX-XXXXX-XXXXX',
    };
  }

  // Ici vous pouvez ajouter une vérification serveur si besoin
  // Pour l'instant, on valide juste le format
  
  const now = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY_LICENSE, licenseKey.toUpperCase());
  localStorage.setItem(STORAGE_KEY_LICENSE_ACTIVATED, now);

  console.log('✅ Licence activée:', licenseKey.toUpperCase());

  return {
    success: true,
    message: 'Licence activée avec succès ! Merci pour votre achat. 🎉',
  };
}

/**
 * Révoque/désactive la licence (pour tests)
 */
export function revokeLicense(): void {
  localStorage.removeItem(STORAGE_KEY_LICENSE);
  localStorage.removeItem(STORAGE_KEY_LICENSE_ACTIVATED);
  console.log('🔓 Licence révoquée');
}

/**
 * Réinitialise complètement le système de licence (DANGER - pour tests uniquement)
 */
export function resetLicenseSystem(): void {
  localStorage.removeItem(STORAGE_KEY_TRIAL_START);
  localStorage.removeItem(STORAGE_KEY_LICENSE);
  localStorage.removeItem(STORAGE_KEY_LICENSE_ACTIVATED);
  console.log('🔄 Système de licence réinitialisé');
}
