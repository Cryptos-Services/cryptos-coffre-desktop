/**
 * Bibliothèque WebAuthn pour l'authentification 2FA
 * Support: Touch ID, Face ID, Windows Hello, YubiKey, etc.
 */

import { WebAuthnCredential } from '../types/security';

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
      userVerification: 'required',
      requireResidentKey: false,
    },
    timeout: 60000,
    attestation: 'none',
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Échec de création du credential');
    }

    const response = credential.response as AuthenticatorAttestationResponse;

    const webAuthnCredential: WebAuthnCredential = {
      id: credential.id,
      credentialId: arrayBufferToBase64url(credential.rawId),
      publicKey: arrayBufferToBase64url(response.getPublicKey()!),
      authenticatorType,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      name: `${authenticatorType === 'platform' ? 'Biométrie' : 'Clé de sécurité'} - ${new Date().toLocaleDateString()}`,
    };

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

  const challenge = generateChallenge();
  const allowCredentials = credentials.map(cred => ({
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
    userVerification: 'required',
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
  return credentials.map(cred =>
    cred.credentialId === credentialId
      ? { ...cred, lastUsed: new Date().toISOString() }
      : cred
  );
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
