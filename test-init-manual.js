// Test manuel d'initialisation
// Copiez-collez TOUT ce code dans la console Electron (F12)

(async () => {
  console.log('🔄 Début test initialisation...');
  
  try {
    // Import des fonctions
    const { deriveKeysWithSalt, saltToBase64 } = await import('http://localhost:3000/_next/static/chunks/webpack.js').catch(() => {
      // Si échec, utilise l'import global
      return window;
    });
    
    if (!deriveKeysWithSalt) {
      console.error('❌ Fonctions de chiffrement non disponibles');
      console.log('Essayons une autre méthode...');
      
      // Méthode alternative : appel direct à crypto
      const passphrase = 'Cryptos-Services-Test-Coffre-Fort';
      const encoder = new TextEncoder();
      const data = encoder.encode(passphrase);
      
      // Génère un salt aléatoire
      const salt = crypto.getRandomValues(new Uint8Array(32));
      
      // Dérive la clé
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        data,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      // Convertit le salt en base64
      const saltBase64 = btoa(String.fromCharCode(...salt));
      
      console.log('✅ Clé dérivée avec succès');
      console.log('📦 Salt:', saltBase64.substring(0, 20) + '...');
      
      // Sauvegarde
      localStorage.setItem('vault_salt', saltBase64);
      localStorage.setItem('vault_data', '[]');
      
      console.log('✅ Données sauvegardées dans localStorage');
      console.log('🔍 Vérification:', localStorage.getItem('vault_salt') ? 'OK' : 'ÉCHEC');
      
      alert('✅ Coffre initialisé manuellement !\n\nPassphrase: Cryptos-Services-Test-Coffre-Fort\n\nVous pouvez maintenant recharger la page.');
      
      return;
    }
    
    // Si les fonctions existent, utilise-les
    const passphrase = 'Cryptos-Services-Test-Coffre-Fort';
    const result = await deriveKeysWithSalt(passphrase);
    const saltBase64 = saltToBase64(result.salt);
    
    localStorage.setItem('vault_salt', saltBase64);
    localStorage.setItem('vault_data', '[]');
    
    console.log('✅ Coffre initialisé !');
    console.log('📦 Salt:', saltBase64.substring(0, 20) + '...');
    
    alert('✅ Coffre créé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    alert('❌ Erreur: ' + error.message);
  }
})();
