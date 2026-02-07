# 📜 Scripts Utilitaires

Ce dossier contient des scripts utilitaires pour l'application Cryptos Coffre Desktop.

---

## 📋 Liste des Scripts

### 1. `copy-web-build.js`

**Usage** : Copie le build web depuis Cryptos-Services vers dist-web/

```powershell
npm run copy-web
```

**Description** :

- Copie `E:\Cryptos-Services\out\` → `dist-web/`
- Nécessaire pour build production Electron
- L'app Electron charge depuis `dist-web/index.html` en production

**Quand l'utiliser** :

- Après avoir buildé Cryptos-Services (`npm run build`)
- Avant de faire `npm run build:win`
- Si erreur "Build web introuvable"

---

### 2. `diagnostic-localstorage.js` 🆕

**Usage** : Diagnostic complet de l'état localStorage

```javascript
// Dans DevTools Console (F12)
// Copiez-collez le contenu du fichier
```

**Description** :

- Affiche toutes les clés localStorage
- Valide le format du salt (base64 vs hex)
- Compte les entrées du coffre
- Vérifie les paramètres de sécurité
- Teste l'API Web Crypto
- Donne des recommandations

**Sortie exemple** :

```txt
🔍 === DIAGNOSTIC CRYPTOS COFFRE ===

📦 Clés localStorage présentes:
['vault_salt', 'vault_data', 'security-settings']

🧂 Salt (vault_salt):
  ✅ Présent (24 caractères)
  📄 Aperçu: aBcDeFgHiJkLmNoPqRsTuVwX...
  🔍 Format: ✅ Base64 valide

🗄️ Données (vault_data):
  ✅ Présent et parsable
  📊 Nombre d'entrées: 3
  📝 Première entrée: { id: '...', type: 'password', name: 'Gmail', ... }

...

📊 === RÉSUMÉ ===
État: ✅ VALIDE (coffre prêt)

💡 RECOMMANDATIONS:
  → Coffre OK ! Vous pouvez déverrouiller avec votre passphrase
```

**Quand l'utiliser** :

- ❌ Erreur "Passphrase incorrecte"
- ❌ Erreur "Unexpected token '<'"
- ❌ Coffre ne s'ouvre pas
- ❓ Vérifier l'intégrité des données

---

## 🔧 Commandes NPM Associées

```json
{
  "copy-web": "node scripts/copy-web-build.js",
  "dev": "electron-vite dev",
  "build": "electron-vite build",
  "build:win": "npm run build && electron-builder --win"
}
```

---

## 📝 Création de Nouveaux Scripts

### Template de script utilitaire

```javascript
/**
 * Nom du script
 * Description de ce qu'il fait
 */

const fs = require('fs');
const path = require('path');

function main() {
  try {
    console.log('🚀 Démarrage...');
    
    // Votre code ici
    
    console.log('✅ Terminé !');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();
```

### Ajouter au package.json

```json
"scripts": {
  "mon-script": "node scripts/mon-script.js"
}
```

---

## 🐛 Dépannage

### Script ne s'exécute pas

```powershell
# Vérifier que Node.js est installé
node --version

# Exécuter directement
node scripts/copy-web-build.js
```

### Erreur de permissions

```powershell
# Exécuter en tant qu'administrateur (PowerShell)
# Ou vérifier les droits sur les dossiers
```

---

## 📚 Références

- [Node.js Scripts](https://nodejs.org/api/modules.html)
- [NPM Scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts)
- [Electron Builder](https://www.electron.build/)

---

**Mis à jour** : 3 février 2026
