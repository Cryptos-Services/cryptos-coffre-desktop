/**
 * Utilitaires pour la génération et gestion des codes de récupération
 */

import { RecoveryCode } from '../types/security';

/**
 * Génère un code de récupération aléatoire sécurisé
 * Format: XXXX-XXXX-XXXX (12 caractères alphanumériques)
 */
function generateSingleCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Évite 0, O, 1, I pour éviter confusion
  const segments: string[] = [];
  
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      segment += chars[randomIndex];
    }
    segments.push(segment);
  }
  
  return segments.join('-');
}

/**
 * Génère un ensemble de codes de récupération
 * @param count Nombre de codes à générer (défaut: 10)
 * @returns Tableau de codes de récupération non utilisés
 */
export function generateRecoveryCodes(count: number = 10): RecoveryCode[] {
  const codes: RecoveryCode[] = [];
  const uniqueCodes = new Set<string>();
  
  while (uniqueCodes.size < count) {
    const code = generateSingleCode();
    if (!uniqueCodes.has(code)) {
      uniqueCodes.add(code);
      codes.push({
        code,
        used: false,
      });
    }
  }
  
  return codes;
}

/**
 * Valide un code de récupération
 * @param inputCode Code entré par l'utilisateur
 * @param recoveryCodes Liste des codes valides
 * @returns Code correspondant si valide, undefined sinon
 */
export function validateRecoveryCode(
  inputCode: string,
  recoveryCodes: RecoveryCode[]
): RecoveryCode | undefined {
  // Normalise le code (majuscules, sans espaces)
  const normalized = inputCode.toUpperCase().replace(/\s/g, '');
  
  return recoveryCodes.find(
    rc => rc.code === normalized && !rc.used
  );
}

/**
 * Marque un code de récupération comme utilisé
 * @param code Code à marquer
 * @param recoveryCodes Liste des codes
 * @returns Liste mise à jour
 */
export function markRecoveryCodeAsUsed(
  code: string,
  recoveryCodes: RecoveryCode[]
): RecoveryCode[] {
  return recoveryCodes.map(rc => 
    rc.code === code 
      ? { ...rc, used: true, usedAt: new Date().toISOString() }
      : rc
  );
}

/**
 * Compte le nombre de codes inutilisés
 */
export function countUnusedCodes(recoveryCodes: RecoveryCode[]): number {
  return recoveryCodes.filter(rc => !rc.used).length;
}

/**
 * Formate un code pour l'affichage (ajoute des espaces pour lisibilité)
 */
export function formatCodeForDisplay(code: string): string {
  return code.replace(/-/g, ' - ');
}
