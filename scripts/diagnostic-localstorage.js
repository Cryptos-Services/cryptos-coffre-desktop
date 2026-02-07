/**
 * Script de diagnostic localStorage pour Cryptos Coffre
 * 
 * Ce script permet d'inspecter l'état du localStorage utilisé par l'application,
 * À exécuter dans la console DevTools (F12)
 */

console.log('🔍 === DIAGNOSTIC CRYPTOS COFFRE ===\n');

// 1. Vérifier les clés localStorage
console.log('📦 Clés localStorage présentes:');
const keys = Object.keys(localStorage);
console.log(keys.length > 0 ? keys : '❌ AUCUNE CLÉ (localStorage vide)');
console.log('');

// 2. Vérifier le salt
const salt = localStorage.getItem('vault_salt');
console.log('🧂 Salt (vault_salt):');
if (salt) {
  console.log(`  ✅ Présent (${salt.length} caractères)`);
  console.log(`  📄 Aperçu: ${salt.substring(0, 30)}...`);
  console.log(`  🔍 Format: ${/^[A-Za-z0-9+/]+=*$/.test(salt) ? '✅ Base64 valide' : '❌ Pas en base64 !'}`);
} else {
  console.log('  ❌ ABSENT (coffre non initialisé)');
}
console.log('');

// 3. Vérifier les données
const vaultData = localStorage.getItem('vault_data');
console.log('🗄️ Données (vault_data):');
if (vaultData) {
  try {
    const entries = JSON.parse(vaultData);
    console.log(`  ✅ Présent et parsable`);
    console.log(`  📊 Nombre d'entrées: ${entries.length}`);
    if (entries.length > 0) {
      console.log(`  📝 Première entrée:`, {
        id: entries[0].id,
        type: entries[0].type,
        name: entries[0].name,
        hasEncryptedData: !!entries[0].encryptedData,
        hasIV: !!entries[0].iv,
      });
    }
  } catch (e) {
    console.log(`  ❌ ERREUR DE PARSING: ${e.message}`);
    console.log(`  📄 Aperçu: ${vaultData.substring(0, 100)}...`);
  }
} else {
  console.log('  ⚠️ ABSENT (coffre vide ou non initialisé)');
}
console.log('');

// 4. Vérifier les paramètres de sécurité
const securitySettings = localStorage.getItem('security-settings');
console.log('🔐 Paramètres de sécurité:');
if (securitySettings) {
  try {
    const settings = JSON.parse(securitySettings);
    console.log('  ✅ Présent:', {
      autoLock: settings.autoLockEnabled ? `${settings.autoLockTimeout}min` : 'Désactivé',
      totp: settings.totpEnabled ? 'Activé' : 'Désactivé',
      webauthn: settings.webauthnEnabled ? 'Activé' : 'Désactivé',
      recoveryCodes: settings.recoveryCodesEnabled ? `${settings.recoveryCodes?.length || 0} codes` : 'Désactivé',
    });
  } catch (e) {
    console.log(`  ⚠️ Erreur parsing: ${e.message}`);
  }
} else {
  console.log('  ⚠️ ABSENT (paramètres par défaut)');
}
console.log('');

// 5. Vérifier les dossiers
const folders = localStorage.getItem('vault-folders');
console.log('📁 Dossiers:');
if (folders) {
  try {
    const folderList = JSON.parse(folders);
    console.log(`  ✅ ${folderList.length} dossier(s)`);
  } catch (e) {
    console.log(`  ⚠️ Erreur parsing: ${e.message}`);
  }
} else {
  console.log('  ⚠️ Aucun dossier');
}
console.log('');

// 6. Vérifier les logs d'audit
const auditLogs = localStorage.getItem('audit-logs');
console.log('📜 Logs d\'audit:');
if (auditLogs) {
  try {
    const logs = JSON.parse(auditLogs);
    console.log(`  ✅ ${logs.length} événement(s)`);
    if (logs.length > 0) {
      console.log('  📝 Dernier événement:', logs[logs.length - 1]);
    }
  } catch (e) {
    console.log(`  ⚠️ Erreur parsing: ${e.message}`);
  }
} else {
  console.log('  ⚠️ Aucun log');
}
console.log('');

// 7. Vérifier sessionStorage
console.log('🔑 Session (sessionStorage):');
const sessionKeys = Object.keys(sessionStorage);
console.log(sessionKeys.length > 0 ? `  ✅ ${sessionKeys.length} clé(s): ${sessionKeys.join(', ')}` : '  ⚠️ Vide (coffre verrouillé)');
console.log('');

// 8. Test de l'API Web Crypto
console.log('🔐 Test Web Crypto API:');
if (window.crypto && window.crypto.subtle) {
  console.log('  ✅ Web Crypto API disponible');
  try {
    const testSalt = crypto.getRandomValues(new Uint8Array(16));
    console.log('  ✅ crypto.getRandomValues fonctionne');
    console.log(`  📊 Test salt généré: ${testSalt.length} bytes`);
  } catch (e) {
    console.log(`  ❌ Erreur: ${e.message}`);
  }
} else {
  console.log('  ❌ Web Crypto API NON DISPONIBLE !');
}
console.log('');

// 9. Résumé de l'état
console.log('📊 === RÉSUMÉ ===');
const hasSalt = !!salt;
const hasData = !!vaultData;
const isValidSalt = salt ? /^[A-Za-z0-9+/]+=*$/.test(salt) : false;

let status = '❓ INDÉTERMINÉ';
if (!hasSalt && !hasData) {
  status = '🆕 NOUVEAU (coffre non initialisé)';
} else if (hasSalt && !hasData) {
  status = '⚠️ INCOMPLET (salt sans données)';
} else if (!hasSalt && hasData) {
  status = '❌ CORROMPU (données sans salt)';
} else if (hasSalt && hasData && isValidSalt) {
  status = '✅ VALIDE (coffre prêt)';
} else if (hasSalt && hasData && !isValidSalt) {
  status = '❌ SALT INVALIDE (format incorrect)';
}

console.log(`État: ${status}`);
console.log('');

// 10. Recommandations
console.log('💡 RECOMMANDATIONS:');
if (status === '🆕 NOUVEAU (coffre non initialisé)') {
  console.log('  → Créez votre coffre avec une passphrase forte');
} else if (status.includes('❌')) {
  console.log('  → Réinitialisez localStorage: localStorage.clear()');
  console.log('  → Recréez votre coffre depuis l\'init');
  console.log('  → Ou importez un backup .vault si vous en avez un');
} else if (status.includes('⚠️')) {
  console.log('  → Vérifiez l\'intégrité: localStorage.setItem("vault_data", "[]")');
} else {
  console.log('  → Coffre OK ! Vous pouvez déverrouiller avec votre passphrase');
}
console.log('');

console.log('🔧 ACTIONS UTILES:');
console.log('  • Vider localStorage: localStorage.clear()');
console.log('  • Afficher salt: localStorage.getItem("vault_salt")');
console.log('  • Afficher données: JSON.parse(localStorage.getItem("vault_data"))');
console.log('  • Exporter tout: console.log(JSON.stringify(localStorage, null, 2))');
console.log('');

console.log('✅ Diagnostic terminé !');
