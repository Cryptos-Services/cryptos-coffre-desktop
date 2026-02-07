# 🔗 Intégration Cryptos-Services → Electron

Ce document explique comment l'application Electron charge et intègre le vault web de Cryptos-Services.

---

## 📋 Workflow complet

### 1️⃣ Build Cryptos-Services

```bash
cd E:\Cryptos-Services
npm run build
```

**Résultat** : Crée `out/` avec le site statique Next.js

**Contenu de `out/`** :

```plan
out/
├── _next/               # JS/CSS bundlés
│   ├── static/
│   └── ...
├── ressource/
│   └── pages/
│       └── vault-dashboard.html  ← Page principale
├── index.html
└── ...
```

### 2️⃣ Copier vers Electron

```bash
cd E:\Cryptos-Vault-Desktop
npm run copy-web
```

**Action** : Copie `E:\Cryptos-Services\out\` → `E:\Cryptos-Vault-Desktop\dist-web\`

### 3️⃣ Electron charge le vault

Dans `renderer/index.html` :

```html
<iframe src="../dist-web/ressource/pages/vault-dashboard.html"></iframe>
```

Electron affiche le vault dans un iframe sécurisé.

---

## 🔄 Communication Electron ↔ Web

### Du Menu Electron → Vault Web

**Exemple** : Bouton "Verrouiller" dans le menu

1. **Menu** (`main/main.ts`) :

   ```typescript
   {
     label: 'Verrouiller',
     click: () => {
       mainWindow?.webContents.send('vault:lock');
     }
   }
   ```

2. **Preload** (`main/preload.ts`) :

   ```typescript
   vaultAPI.onLock((callback) => 
     ipcRenderer.on('vault:lock', () => callback())
   );
   ```

3. **Renderer** (`renderer/index.html`) :

   ```javascript
   window.electronAPI.vault.onLock(() => {
     // Envoie au vault via postMessage
     iframe.contentWindow.postMessage(
       { type: 'VAULT_LOCK' },
       '*'
     );
   });
   ```

4. **Vault Web** (Cryptos-Services) :

   ```javascript
   window.addEventListener('message', (event) => {
     if (event.data.type === 'VAULT_LOCK') {
       // Appelle la fonction lock() du vault
       handleLock();
     }
   });
   ```

### Du Vault Web → Electron

**Exemple** : Export vers fichier natif

1. **Vault Web** appelle :

   ```javascript
   if (window.electronAPI) {
     const result = await window.electronAPI.vault.exportToFile(vaultData);
     console.log('Exporté vers:', result.path);
   }
   ```

2. **Preload** expose :

   ```typescript
   exportToFile: (data) => 
     ipcRenderer.invoke('vault:export-to-file', data)
   ```

3. **Main** gère :

   ```typescript
   ipcMain.handle('vault:export-to-file', async (_, data) => {
     const { filePath } = await dialog.showSaveDialog({...});
     await fs.writeFile(filePath, data);
     return { success: true, path: filePath };
   });
   ```

---

## 🎯 Fonctionnalités à intégrer

### ✅ Déjà implémenté

- [x] Chargement du vault dans iframe
- [x] Menu natif avec raccourcis
- [x] Handlers export/import fichiers
- [x] Auto-update

### 🔜 À implémenter dans Cryptos-Services

Pour que le vault détecte Electron et utilise les APIs natives :

#### 1. Détection Electron

```typescript
// Dans Cryptos-Services/ressource/lib/detectElectron.ts
export function isElectron(): boolean {
  return typeof window !== 'undefined' && 
         typeof (window as any).electronAPI !== 'undefined';
}

export function getElectronAPI() {
  if (!isElectron()) return null;
  return (window as any).electronAPI;
}
```

#### 2. Adapter VaultExport.tsx

```typescript
// Dans handleExport()
if (isElectron()) {
  const electronAPI = getElectronAPI();
  const result = await electronAPI.vault.exportToFile(
    JSON.stringify(vaultData)
  );
  if (result.success) {
    alert(`✅ Vault exporté vers:\n${result.path}`);
  }
} else {
  // Fallback : download via blob
  const blob = new Blob([JSON.stringify(vaultData)]);
  // ...
}
```

#### 3. Écouter les événements menu

```typescript
// Dans VaultDashboard.tsx useEffect
if (isElectron()) {
  const electronAPI = getElectronAPI();
  
  electronAPI.vault.onLock(() => {
    console.log('🔒 Lock demandé par Electron');
    handleLock();
  });
  
  electronAPI.vault.onExport(() => {
    console.log('💾 Export demandé par Electron');
    handleExport();
  });
}
```

#### 4. Utiliser crypto natif (optionnel)

```typescript
// Dans encryption.ts
if (isElectron()) {
  const electronAPI = getElectronAPI();
  
  // Utilise le crypto Node.js (plus rapide)
  const encrypted = await electronAPI.crypto.encrypt(data, key);
} else {
  // Fallback : Web Crypto API
  const encrypted = await window.crypto.subtle.encrypt(...);
}
```

---

## 🔐 Sécurité

### Context Isolation ✅

- `contextIsolation: true` activé
- `nodeIntegration: false`
- Communication uniquement via IPC

### Sandbox ✅

- `sandbox: true` activé
- Le renderer ne peut pas exécuter de code Node.js directement

### CSP (Content Security Policy)

Dans `renderer/index.html` :

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
```

### Preload bridge

- API minimale exposée via `contextBridge`
- Pas d'accès direct à `ipcRenderer`

---

## 📁 Structure des données

### localStorage (même comportement qu'en web)

Electron utilise le localStorage du renderer, stocké dans :

- **Windows** : `%APPDATA%\Cryptos Coffre\Local Storage`
- **macOS** : `~/Library/Application Support/Cryptos Coffre/Local Storage`
- **Linux** : `~/.config/Cryptos Coffre/Local Storage`

**Données stockées** :

- `vault_salt` : Salt de dérivation
- `security-settings` : Config 2FA, TOTP, etc.
- `vault-audit-log` : Logs d'audit

### sessionStorage

- `vault_passphrase_temp` : Passphrase temporaire (effacée au redémarrage)

---

## 🚀 Développement

### Mode Dev avec Hot Reload

```bash
# Terminal 1 : Next.js dev server
cd E:\Cryptos-Services
npm run dev

# Terminal 2 : Electron dev mode
cd E:\Cryptos-Coffre-Desktop
npm run dev
```

Electron charge `http://localhost:3000` et recharge automatiquement.

### Mode Production

```bash
# Build Next.js
cd E:\Cryptos-Services
npm run build

# Copier
cd E:\Cryptos-Coffre-Desktop
npm run copy-web

# Build Electron
npm run build:win
```

---

## 🐛 Debugging

### Ouvrir DevTools

- **Dev** : F12 ou Menu → Développement → DevTools
- **Prod** : Désactivé par défaut

### Logs

- **Main process** : Terminal où Electron est lancé
- **Renderer** : DevTools Console

### Vérifier la communication IPC

```javascript
// Dans le vault web
console.log('Electron API disponible ?', !!window.electronAPI);
console.log('Platform:', window.electronAPI?.platform);
```

---

## 📋 Checklist d'intégration

Pour une intégration complète, modifier dans Cryptos-Services :

- [ ] Créer `lib/detectElectron.ts`
- [ ] Adapter `VaultExport.tsx` pour utiliser dialogs natifs
- [ ] Adapter `VaultImport.tsx` pour utiliser dialogs natifs
- [ ] Écouter événements menu dans `VaultDashboard.tsx`
- [ ] (Optionnel) Utiliser crypto natif dans `encryption.ts`
- [ ] Tester export/import via menu Electron
- [ ] Tester raccourcis clavier (Ctrl+L, Ctrl+E, etc.)
- [ ] Vérifier localStorage persiste entre redémarrages

---

## 🆘 Troubleshooting

### "Cannot read properties of undefined (electronAPI)"

→ Le preload ne s'est pas chargé correctement
→ Vérifiez `preload: path.join(__dirname, 'preload.js')` dans main.ts

### "Cross-origin blocked"

→ Ajustez la CSP dans `renderer/index.html`
→ Ou utilisez `webSecurity: false` (dev uniquement)

### localStorage vide après update

→ Normal, changement de version peut réinitialiser
→ Utilisez Export/Import pour migrer les données

---

## 📞 Support

Si vous avez des questions sur l'intégration :

- **Docs Electron** : `https://www.electronjs.org/docs`
- **Docs Next.js** : `https://nextjs.org/docs`
- **Issues** : `https://github.com/cryptos-services/cryptos-coffre-desktop/issues`
