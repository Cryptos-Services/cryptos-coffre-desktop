/**
 * Base de données AAGUID (Authenticator Attestation GUID)
 * Permet d'identifier le modèle physique de la clé de sécurité
 * Sources:
 * - YubiKey: https://support.yubico.com/hc/en-us/articles/360016648959
 * - FIDO Alliance: https://mds.fidoalliance.org/
 */

export interface AuthenticatorInfo {
  name: string;
  manufacturer: string;
  icon: string;
  certLevel?: string;
}

/**
 * Registre des AAGUIDs connus
 * Format: AAGUID → Informations de l'authenticator
 */
export const AAGUID_REGISTRY: Record<string, AuthenticatorInfo> = {
  // ========== YubiKey 5 Series ==========
  'cb69481e-8ff7-4039-93ec-0a2729a154a8': {
    name: 'YubiKey 5 / Nano (FW 5.1)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 1',
  },
  'ee882879-721c-4913-9775-3dfcce97072a': {
    name: 'YubiKey 5 / Nano / 5C (FW 5.2-5.4)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 1',
  },
  'fa2b99dc-9e39-4257-8f92-4a30d23c4118': {
    name: 'YubiKey 5 NFC (FW 5.1)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 1',
  },
  '2fc0579f-8113-47ea-b116-bb5a8db9202a': {
    name: 'YubiKey 5 NFC / 5C NFC (FW 5.2-5.4)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 1',
  },
  'a25342c0-3cdc-4414-8e46-f4807fca511c': {
    name: 'YubiKey 5 NFC / 5C NFC (FW 5.7)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  'd7781e5d-e353-46aa-afe2-3ca49f13332a': {
    name: 'YubiKey 5 NFC / 5C NFC (FW 5.7 alt)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  '662ef48a-95e2-4aaa-a6c1-5b9c40375824': {
    name: 'YubiKey 5 NFC Enhanced PIN (FW 5.7)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  '19083c3d-8383-4b18-bc03-8f1c9ab2fd1b': {
    name: 'YubiKey 5 Nano / 5C Nano / 5C (FW 5.7)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  'ff4dac45-ede8-4ec2-aced-cf66103f4335': {
    name: 'YubiKey 5 Nano / 5C Nano / 5C (FW 5.7 alt)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  'c5ef55ff-ad9a-4b9f-b580-adebafe026d0': {
    name: 'YubiKey 5Ci (FW 5.2-5.4)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 1',
  },
  'a02167b9-ae71-4ac7-9a07-06432ebb6f1c': {
    name: 'YubiKey 5Ci (FW 5.7)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  '24673149-6c86-42e7-98d9-433fb5b73296': {
    name: 'YubiKey 5Ci (FW 5.7 alt)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  '3aa78eb1-ddd8-46a8-a821-8f8ec57a7bd5': {
    name: 'YubiKey 5 CCN Series NFC',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },

  // ========== YubiKey 5 FIPS Series ==========
  'c1f9a0bc-1dd2-404a-b27f-8e29047a43fd': {
    name: 'YubiKey 5 NFC / 5C NFC FIPS',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2 FIPS',
  },
  '73bb0cd4-e502-49b8-9c6f-b59445bf720b': {
    name: 'YubiKey 5 Nano / 5C Nano / 5C FIPS',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2 FIPS',
  },
  '85203421-48f9-4355-9bc8-8a53846e5083': {
    name: 'YubiKey 5Ci FIPS',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2 FIPS',
  },

  // ========== YubiKey 5 FIPS RC Series ==========
  'fcc0118f-cd45-435b-8da1-9782b2da0715': {
    name: 'YubiKey 5 NFC / 5C NFC FIPS RC',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2 FIPS',
  },
  '57f7de54-c807-4eab-b1c6-1c9be7984e92': {
    name: 'YubiKey 5 Nano / 5C Nano / 5C FIPS RC',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2 FIPS',
  },
  '7b96457d-e3cd-432b-9ceb-c9fdd7ef7432': {
    name: 'YubiKey 5Ci FIPS RC',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2 FIPS',
  },

  // ========== YubiKey Bio Series ==========
  'd8522d9f-575b-4866-88a9-ba99fa02f35b': {
    name: 'YubiKey Bio FIDO Edition (FW 5.5-5.6)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 1',
  },
  'dd86a2da-86a0-4cbe-b462-4bd31f57bc6f': {
    name: 'YubiKey Bio FIDO Edition (FW 5.7)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  '7409272d-1ff9-4e10-9fc9-ac0019c124fd': {
    name: 'YubiKey Bio FIDO Edition (FW 5.7 alt)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  '7d1351a6-e097-4852-b8bf-c9ac5c9ce4a3': {
    name: 'YubiKey Bio Multi-protocol (FW 5.6)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 1',
  },
  '90636e1f-ef82-43bf-bdcf-5255f139d12f': {
    name: 'YubiKey Bio Multi-protocol (FW 5.7)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  '34744913-4f57-4e6e-a527-e9ec3c4b94e6': {
    name: 'YubiKey Bio Multi-protocol (FW 5.7 alt)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },

  // ========== Security Key Series (Yubico) ==========
  'f8a011f3-8c0a-4d15-8006-17111f9edc7d': {
    name: 'Security Key by Yubico (FW 5.1)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 1',
  },
  'b92c3f9a-c014-4056-887f-140a2501163b': {
    name: 'Security Key by Yubico (FW 5.2)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 1',
  },
  '6d44ba9b-f6ec-2e49-b930-0c8fe920cb73': {
    name: 'Security Key NFC (FW 5.1)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 1',
  },
  '149a2021-8ef6-4133-96b8-81f8d5b7f1f5': {
    name: 'Security Key NFC Blue (FW 5.2-5.4)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 1',
  },
  'a4e9fc6d-4cbe-4758-b8ba-37598bb5bbaa': {
    name: 'Security Key NFC Black (FW 5.4)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  'e77e3c64-05e3-428b-8824-0cbeb04b829d': {
    name: 'Security Key NFC Black (FW 5.7)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  'b7d3f68e-88a6-471e-9ecf-2df26d041ede': {
    name: 'Security Key NFC Black (FW 5.7 alt)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  '0bb43545-fd2c-4185-87dd-feb0b2916ace': {
    name: 'Security Key NFC Enterprise (FW 5.4)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  '47ab2fb4-66ac-4184-9ae1-86be814012d5': {
    name: 'Security Key NFC Enterprise (FW 5.7)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  'ed042a3a-4b22-4455-bb69-a267b652ae7e': {
    name: 'Security Key NFC Enterprise (FW 5.7 alt)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },

  // ========== Enterprise Attestation YubiKeys ==========
  '1ac71f64-468d-4fe0-bef1-0e5f2f551f18': {
    name: 'YubiKey 5 NFC / 5C NFC Enterprise',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  '6ab56fad-881f-4a43-acb2-0be065924522': {
    name: 'YubiKey 5 NFC / 5C NFC Enterprise (alt)',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },
  'b2c1a50b-dad8-4dc7-ba4d-0ce9597904bc': {
    name: 'YubiKey 5 NFC Enhanced PIN Enterprise',
    manufacturer: 'Yubico',
    icon: '🔑',
    certLevel: 'Level 2',
  },

  // ========== Ledger ==========
  '341e4da9-3c2e-8103-5a9f-aad887135200': {
    name: 'Ledger Nano S',
    manufacturer: 'Ledger',
    icon: '💎',
  },
  'fcb1bcb4-f370-078c-6993-bc24d0ae3fbe': {
    name: 'Ledger Nano X',
    manufacturer: 'Ledger',
    icon: '💎',
  },
  '58b44d0b-0a7c-f33a-fd48-f7153c871352': {
    name: 'Ledger Nano S Plus FIDO2 Authenticator',
    manufacturer: 'Ledger',
    icon: '💎',
  },
  '6e24d385-004a-16a0-7bfe-efd963845b34': {
    name: 'Ledger Stax FIDO2 Authenticator',
    manufacturer: 'Ledger',
    icon: '💎',
  },
  '1d8cac46-47a1-3386-af50-e88ae46fe802': {
    name: 'Ledger Flex FIDO2 Authenticator',
    manufacturer: 'Ledger',
    icon: '💎',
  },

  // ========== Google Titan ==========
  'ee041bce-25e5-4cdb-8f86-897fd6418464': {
    name: 'Google Titan Security Key (USB-A)',
    manufacturer: 'Google',
    icon: '🔐',
  },
  '3e078ffd-4c54-4586-8baa-a77da113a26f': {
    name: 'Google Titan Security Key (USB-C)',
    manufacturer: 'Google',
    icon: '🔐',
  },
  'bada5566-a7aa-401f-bd96-45619a55120d': {
    name: 'Google Titan Security Key (NFC)',
    manufacturer: 'Google',
    icon: '🔐',
  },

  // ========== Feitian ==========
  '12ded745-4bed-47d4-abaa-e713f51d6393': {
    name: 'Feitian ePass FIDO2',
    manufacturer: 'Feitian',
    icon: '🔑',
  },
  '77010bd7-212a-4fc9-b236-d2ca5e9d4084': {
    name: 'Feitian BioPass FIDO2',
    manufacturer: 'Feitian',
    icon: '🔑',
  },
  '3e22415d-7fdf-4ea4-8a0c-dd60c4249b9d': {
    name: 'Feitian AllinOne FIDO2',
    manufacturer: 'Feitian',
    icon: '🔑',
  },

  // ========== Thetis ==========
  '454e5346-4944-4ffd-6c93-8e9267193e9a': {
    name: 'Thetis FIDO2',
    manufacturer: 'Thetis',
    icon: '🔑',
  },

  // ========== SoloKeys ==========
  '8876631b-d4a0-427f-5773-0ec71c9e0279': {
    name: 'SoloKeys Solo',
    manufacturer: 'SoloKeys',
    icon: '🔑',
  },

  // ========== Nitrokey ==========
  // 'a4e9fc6d-4cbe-4758-b8ba-37598bb5bbaa': {
  //   name: 'Nitrokey FIDO2',
  //  manufacturer: 'Nitrokey',
  //  icon: '🔑',
  //},

  // ========== Authenticate (FIDO2 Bluetooth) ==========
  '0ea242b4-43c4-4a1b-8b17-dd6d0b6baec6': {
    name: 'Kensington VeriMark',
    manufacturer: 'Kensington',
    icon: '🔑',
  },

  // ========== Windows Hello ==========
  '08987058-cadc-4b81-b6e1-30de50dcbe96': {
    name: 'Windows Hello',
    manufacturer: 'Microsoft',
    icon: '📱',
  },
  '6028b017-b1d4-4c02-b4b3-afcdafc96bb2': {
    name: 'Windows Hello (Software)',
    manufacturer: 'Microsoft',
    icon: '📱',
  },

  // ========== Apple Touch ID / Face ID ==========
  'adce0002-35bc-c60a-648b-0b25f1f05503': {
    name: 'Touch ID (Mac)',
    manufacturer: 'Apple',
    icon: '🍎',
  },
  'dd4ec289-e01d-41c9-bb89-70fa845d4bf2': {
    name: 'Touch ID (iPhone/iPad)',
    manufacturer: 'Apple',
    icon: '🍎',
  },
};

/**
 * Recherche les informations d'un authenticator par AAGUID
 */
export function getAuthenticatorInfo(aaguid: string): AuthenticatorInfo | null {
  // Normalise l'AAGUID (lowercase, sans tirets)
  const normalized = aaguid.toLowerCase().replace(/-/g, '');
  
  // Recherche avec et sans tirets
  const withDashes = aaguid.toLowerCase();
  const withoutDashes = normalized;
  
  // Essaye avec tirets d'abord
  if (AAGUID_REGISTRY[withDashes]) {
    return AAGUID_REGISTRY[withDashes];
  }
  
  // Essaye sans tirets
  if (AAGUID_REGISTRY[withoutDashes]) {
    return AAGUID_REGISTRY[withoutDashes];
  }
  
  // Recherche dans toutes les clés (fallback)
  for (const [key, info] of Object.entries(AAGUID_REGISTRY)) {
    if (key.replace(/-/g, '') === withoutDashes) {
      return info;
    }
  }
  
  return null;
}

/**
 * Formatte le nom de l'authenticator pour affichage
 */
export function formatAuthenticatorName(
  aaguid: string | undefined,
  authenticatorType: 'platform' | 'cross-platform',
  fallbackName?: string
): string {
  if (!aaguid) {
    // Pas d'AAGUID, utilise le type générique
    if (authenticatorType === 'platform') {
      return fallbackName || 'Biométrie (Windows Hello)';
    }
    return fallbackName || 'Clé de sécurité';
  }
  
  const info = getAuthenticatorInfo(aaguid);
  
  if (info) {
    return `${info.icon} ${info.name}`;
  }
  
  // AAGUID inconnu, affiche l'AAGUID
  if (authenticatorType === 'platform') {
    return `📱 Biométrie (AAGUID: ${aaguid.slice(0, 8)}...)`;
  }
  return `🔑 Clé externe (AAGUID: ${aaguid.slice(0, 8)}...)`;
}

/**
 * Extrait l'AAGUID d'un attestationObject CBOR
 */
export function extractAAGUIDFromAttestation(attestationObject: ArrayBuffer): string | null {
  try {
    // L'AAGUID est situé à l'offset 37 dans authData (16 bytes)
    // Format authData: rpIdHash (32) + flags (1) + counter (4) + AAGUID (16) + ...
    const attestationBytes = new Uint8Array(attestationObject);
    
    console.log('🔍 Taille attestationObject:', attestationBytes.length, 'bytes');
    
    // Méthode 1: Recherche "authData" dans le CBOR
    let authDataStart = -1;
    const authDataPattern = [0x68, 0x61, 0x75, 0x74, 0x68, 0x44, 0x61, 0x74, 0x61]; // "authData"
    
    for (let i = 0; i < attestationBytes.length - authDataPattern.length - 60; i++) {
      let match = true;
      for (let j = 0; j < authDataPattern.length; j++) {
        if (attestationBytes[i + j] !== authDataPattern[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        authDataStart = i + authDataPattern.length;
        console.log('✅ authData trouvé à offset:', authDataStart);
        break;
      }
    }
    
    if (authDataStart !== -1) {
      // Saute les bytes CBOR (type + longueur)
      let authDataOffset = authDataStart;
      const firstByte = attestationBytes[authDataOffset];
      
      console.log('🔍 Premier byte authData:', '0x' + firstByte.toString(16).padStart(2, '0'));
      
      // Si c'est un byte string (0x58 = byte string with 1-byte length)
      if (firstByte === 0x58) {
        const length = attestationBytes[authDataOffset + 1];
        authDataOffset += 2; // Type (1) + length (1)
        console.log('📏 authData length (0x58):', length, 'bytes');
      } else if (firstByte === 0x59) {
        const length = (attestationBytes[authDataOffset + 1] << 8) | attestationBytes[authDataOffset + 2];
        authDataOffset += 3; // Type (1) + length (2)
        console.log('📏 authData length (0x59):', length, 'bytes');
      } else if ((firstByte & 0xE0) === 0x40) {
        // byte string court (0x40-0x57)
        const length = firstByte & 0x1F;
        authDataOffset += 1;
        console.log('📏 authData length (court):', length, 'bytes');
      } else {
        console.warn('⚠️ Type CBOR authData inconnu:', '0x' + firstByte.toString(16));
      }
      
      // AAGUID commence à offset 37 dans authData
      const aaguidOffset = authDataOffset + 37;
      
      console.log('🎯 Offset AAGUID calculé:', aaguidOffset);
      
      if (aaguidOffset + 16 <= attestationBytes.length) {
        // Extrait les 16 bytes de l'AAGUID
        const aaguidBytes = attestationBytes.slice(aaguidOffset, aaguidOffset + 16);
        
        console.log('📦 AAGUID bytes bruts:', Array.from(aaguidBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        // Convertit en format UUID standard (avec tirets)
        const aaguid = Array.from(aaguidBytes)
          .map((b, i) => {
            const hex = b.toString(16).padStart(2, '0');
            // Ajoute des tirets aux positions 4, 6, 8, 10
            if (i === 4 || i === 6 || i === 8 || i === 10) {
              return '-' + hex;
            }
            return hex;
          })
          .join('');
        
        console.log('✅ AAGUID formaté:', aaguid);
        return aaguid;
      } else {
        console.warn('❌ Offset AAGUID dépasse buffer:', aaguidOffset + 16, '>', attestationBytes.length);
      }
    }
    
    // Méthode 2: Fallback - cherche pattern rpIdHash (32 bytes) + flags + counter
    console.log('⚠️ Méthode 1 échouée, essai méthode 2 (recherche heuristique)');
    
    // Cherche la séquence typique: 32 bytes (rpIdHash) + 0x41 (flags avec UP+UV) + 4 bytes counter
    for (let i = 0; i < attestationBytes.length - 53; i++) {
      const flags = attestationBytes[i + 32];
      
      // Flags typiques: 0x41 (UP + UV) ou 0x45 (UP + UV + AT)
      if (flags === 0x41 || flags === 0x45 || flags === 0x01 || flags === 0x05) {
        const potentialAAGUIDOffset = i + 37;
        
        if (potentialAAGUIDOffset + 16 <= attestationBytes.length) {
          const aaguidBytes = attestationBytes.slice(potentialAAGUIDOffset, potentialAAGUIDOffset + 16);
          
          // Convertit en UUID
          const aaguid = Array.from(aaguidBytes)
            .map((b, idx) => {
              const hex = b.toString(16).padStart(2, '0');
              if (idx === 4 || idx === 6 || idx === 8 || idx === 10) {
                return '-' + hex;
              }
              return hex;
            })
            .join('');
          
          console.log('🔍 AAGUID candidat (méthode 2):', aaguid);
          
          // Vérifie si c'est un UUID valide (pas que des 0 ou FF)
          const allZeros = /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(aaguid);
          const allFFs = /^f{8}-f{4}-f{4}-f{4}-f{12}$/.test(aaguid);
          
          if (!allZeros && !allFFs) {
            console.log('✅ AAGUID trouvé via méthode 2:', aaguid);
            return aaguid;
          }
        }
      }
    }
    
    console.warn('❌ Aucune méthode n\'a pu extraire l\'AAGUID');
    return null;
  } catch (error) {
    console.error('❌ Erreur extraction AAGUID:', error);
    return null;
  }
}
