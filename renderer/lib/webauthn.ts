/**
 * Bibliothèque WebAuthn pour l'authentification 2FA
 * Support: Touch ID, Face ID, Windows Hello, YubiKey, etc.
 */

import { WebAuthnCredential } from '../types/security';
import { extractAAGUIDFromAttestation, formatAuthenticatorName } from './aaguids';

const RP_NAME = 'Cryptos-Services Vault';
const RP_ID = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

/**
 * Vérifie si WebAuthn est disponible dans le navigateur
 */
export function isWebAuthnAvailable(): boolean {
  return typeof window !== 'undefined' && 
         window.PublicKeyCredential !== undefined &&
         typeof window.PublicKeyCredential === 'function';
}

/**
 * Vérifie si la plateforme supporte l'authentification par plateforme (biométrie)
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error('Erreur vérification authenticator:', error);
    return false;
  }
}

/**
 * Génère un challenge aléatoire pour WebAuthn
 */
function generateChallenge(): Uint8Array {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return array;
}

/**
 * Convertit un ArrayBuffer en base64url
 */
function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convertit base64url en ArrayBuffer
 */
function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Enregistre un nouveau credential WebAuthn
 */
export async function registerWebAuthnCredential(
  userId: string,
  userName: string,
  authenticatorType: 'platform' | 'cross-platform' = 'platform'
): Promise<WebAuthnCredential> {
  if (!isWebAuthnAvailable()) {
    throw new Error('WebAuthn n\'est pas disponible sur ce navigateur');
  }

  const challenge = generateChallenge();
  const userIdBuffer = new TextEncoder().encode(userId);

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: challenge as BufferSource,
    rp: {
      name: RP_NAME,
      id: RP_ID,
    },
    user: {
      id: userIdBuffer,
      name: userName,
      displayName: userName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },  // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: authenticatorType,
      // Pour platform (Windows Hello): 'required' = sécurité maximale
      // Pour cross-platform (Yubikey): 'preferred' = compatibilité maximale
      userVerification: authenticatorType === 'platform' ? 'required' : 'preferred',
      requireResidentKey: false,
    },
    timeout: 60000,
    // 'direct' permet de récupérer l'AAGUID réel (peut afficher popup permission)
    // 'indirect' masque l'AAGUID pour confidentialité (retourne 00000000...)
    attestation: 'direct',
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Échec de création du credential');
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    
    // Extrait l'AAGUID depuis l'attestationObject
    let aaguid: string | undefined;
    try {
      const extractedAAGUID = extractAAGUIDFromAttestation(response.attestationObject);
      
      // Vérifie si l'AAGUID est null (00000000-0000-0000-0000-000000000000)
      const isNullAAGUID = extractedAAGUID && /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(extractedAAGUID);
      
      if (extractedAAGUID && !isNullAAGUID) {
        aaguid = extractedAAGUID;
        console.log('✅ AAGUID extrait:', aaguid);
      } else if (isNullAAGUID) {
        console.warn('⚠️ AAGUID masqué (00000000...) - authenticator protège sa confidentialité');
        console.log('💡 Solution: L\'utilisateur peut renommer manuellement le credential');
        aaguid = undefined; // Ne stocke pas l'AAGUID null
      } else {
        console.warn('⚠️ AAGUID non trouvé dans attestationObject');
      }
    } catch (aaguidError) {
      console.error('❌ Erreur extraction AAGUID:', aaguidError);
    }

    // Génère un nom descriptif basé sur l'AAGUID
    const generatedName = formatAuthenticatorName(
      aaguid,
      authenticatorType,
      `${authenticatorType === 'platform' ? 'Biométrie' : 'Clé de sécurité'} - ${new Date().toLocaleDateString()}`
    );

    const webAuthnCredential: WebAuthnCredential = {
      id: credential.id,
      credentialId: arrayBufferToBase64url(credential.rawId),
      publicKey: arrayBufferToBase64url(response.getPublicKey()!),
      authenticatorType,
      aaguid, // Stocke l'AAGUID pour identification future
      enabled: true, // Activé par défaut lors de la création
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      name: generatedName,
    };

    console.log('🚀 Credential WebAuthn créé:', {
      id: webAuthnCredential.id,
      name: webAuthnCredential.name,
      type: webAuthnCredential.authenticatorType,
      enabled: webAuthnCredential.enabled,
    });

    return webAuthnCredential;
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'NotAllowedError') {
      throw new Error('Opération annulée par l\'utilisateur');
    } else if (err.name === 'InvalidStateError') {
      throw new Error('Ce credential existe déjà');
    } else {
      throw new Error(`Erreur WebAuthn: ${err.message || 'Erreur inconnue'}`);
    }
  }
}

/**
 * Authentifie avec un credential WebAuthn existant
 */
export async function authenticateWithWebAuthn(
  credentials: WebAuthnCredential[]
): Promise<{ success: boolean; credentialId?: string }> {
  if (!isWebAuthnAvailable()) {
    throw new Error('WebAuthn n\'est pas disponible sur ce navigateur');
  }

  if (credentials.length === 0) {
    throw new Error('Aucun credential WebAuthn enregistré');
  }

  console.log('🔐 Authentification WebAuthn - Credentials disponibles:', credentials);
  console.log('🔐 État enabled de chaque credential:', credentials.map(c => ({ name: c.name, enabled: c.enabled })));

  // Filtre uniquement les credentials actifs (enabled !== false)
  const enabledCredentials = credentials.filter(cred => cred.enabled !== false);

  console.log('✅ Credentials actifs après filtrage:', enabledCredentials);
  console.log('✅ Nombre de credentials actifs:', enabledCredentials.length);

  if (enabledCredentials.length === 0) {
    throw new Error('Aucun credential WebAuthn actif. Activez au moins un credential dans les paramètres.');
  }

  const challenge = generateChallenge();
  const allowCredentials = enabledCredentials.map(cred => ({
    type: 'public-key' as const,
    id: base64urlToArrayBuffer(cred.credentialId),
    transports: cred.authenticatorType === 'platform' 
      ? ['internal' as const]
      : ['usb' as const, 'nfc' as const, 'ble' as const],
  }));

  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge: challenge as BufferSource,
    timeout: 60000,
    rpId: RP_ID,
    allowCredentials,
    // 'preferred' au lieu de 'required' pour compatibilité Yubikey
    userVerification: 'preferred',
  };

  try {
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (!assertion) {
      return { success: false };
    }

    const credentialId = arrayBufferToBase64url(assertion.rawId);

    return {
      success: true,
      credentialId,
    };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'NotAllowedError') {
      throw new Error('Authentification annulée');
    } else {
      throw new Error(`Erreur d'authentification: ${err.message || 'Erreur inconnue'}`);
    }
  }
}

/**
 * Supprime un credential WebAuthn
 * Note: La suppression côté navigateur n'est pas possible, on le retire juste de notre liste
 */
export function removeWebAuthnCredential(
  credentials: WebAuthnCredential[],
  credentialId: string
): WebAuthnCredential[] {
  return credentials.filter(cred => cred.id !== credentialId);
}

/**
 * Met à jour la date de dernière utilisation d'un credential
 */
export function updateCredentialLastUsed(
  credentials: WebAuthnCredential[],
  credentialId: string
): WebAuthnCredential[] {
  console.log('🔄 [updateCredentialLastUsed] Mise à jour lastUsed:', {
    credentialId,
    credentialsBeforeUpdate: credentials.length,
    credentialIds: credentials.map(c => ({ id: c.id, credentialId: c.credentialId, name: c.name })),
  });
  
  const updated = credentials.map(cred =>
    cred.credentialId === credentialId
      ? { ...cred, lastUsed: new Date().toISOString() }
      : cred
  );
  
  console.log('🔄 [updateCredentialLastUsed] Après mise à jour:', {
    credentialsAfterUpdate: updated.length,
    found: updated.some(c => c.credentialId === credentialId),
  });
  
  return updated;
}

/**
 * Renomme un credential
 */
export function renameWebAuthnCredential(
  credentials: WebAuthnCredential[],
  credentialId: string,
  newName: string
): WebAuthnCredential[] {
  return credentials.map(cred =>
    cred.id === credentialId
      ? { ...cred, name: newName }
      : cred
  );
}
