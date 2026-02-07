# 🚀 Quick Start - Cryptos Coffre Desktop

## ✅ Status actuel

- ✅ **Electron installé** (432 packages)
- ✅ **Structure projet créée**
- ✅ **Next.js dev server running** (`http://localhost:3000`)
- ✅ **Electron dev mode running** (charge depuis localhost:3000)
- ⚠️ **Export statique impossible** (routes API Next.js incompatibles)

---

## 🔧 Mode développement (ACTUEL)

### Workflow Dev

**Terminal 1 : Next.js** ':'

```bash
cd E:\Cryptos-Services
npm run dev
```

→ Lance le serveur sur `http://localhost:3000`

**Terminal 2 : Electron** ':'

```bash
cd E:\Cryptos-Coffre-Desktop
npm run dev
```

→ Charge `http://localhost:3000` dans Electron

**Avantages** :

- ✅ Hot reload automatique
- ✅ Toutes les routes API fonctionnent
- ✅ Dev Tools disponibles (F12)
- ✅ Debugging facile

---

## 📦 Build production (À IMPLÉMENTER)

### Option 1 : Serveur Next.js embarqué ⭐ RECOMMANDÉ

**Architecture** :

```plan
Electron
├── main process
│   ├── Start Next.js server (port 3000)
│   └── Load http://localhost:3000
└── renderer process
    └── Display Next.js app
```

**À faire** :

1. Copier le build Next.js (`.next/`) dans l'app Electron
2. Démarrer un serveur Next.js custom au lancement d'Electron
3. Charger depuis `localhost` interne

**Fichier à créer : `main/server.ts`**

```typescript
import next from 'next';
import { parse } from 'url';
import * as http from 'http';

let server: http.Server | null = null;

export async function startNextServer() {
  const dev = false; // Production mode
  const app = next({ 
    dev, 
    dir: path.join(__dirname, '../../next-app') 
  });
  const handle = app.getRequestHandler();

  await app.prepare();

  server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  server.listen(3000, () => {
    console.log('✅ Next.js server started on http://localhost:3000');
  });
}

export function stopNextServer() {
  server?.close();
}
```

---

### Option 2 : Export statique partiel

**Limitations** :

- ❌ Routes API non disponibles
- ❌ Vault backend requis séparément
- ✅ Taille réduite
- ✅ Pas de serveur Node.js

**À faire** :

1. Créer une version "vault-only" sans routes API
2. Déplacer la logique API vers IPC handlers
3. Export Next.js en statique
4. Charger depuis `file://`

---

## 🎨 Icônes (REQUIS pour build)

### Créer les icônes

Placez dans `resources/icons/` :

- `icon.png` (512x512)
- `icon.ico` (Windows)
- `icon.icns` (macOS)

**Générer automatiquement** :

```bash
npm install -g electron-icon-builder
cd E:\Cryptos-Coffre-Desktop
electron-icon-builder --input=resources/icons/icon.png --output=resources/icons/
```

**Design recommandé** :

- 🔐 Symbole de coffre-fort
- Couleurs : `#5e17eb` (violet) + `#ffde59` (jaune)
- Fond transparent

---

## 🛠️ Intégration Vault ↔ Electron

### Détecter Electron dans le Vault

**Créer : `E:\Cryptos-Services\ressource\lib\electronDetection.ts`**

```typescript
export function isElectron(): boolean {
  return typeof window !== 'undefined' && 
         typeof (window as any).electronAPI !== 'undefined';
}

export function getElectronAPI() {
  if (!isElectron()) return null;
  return (window as any).electronAPI;
}
```

### Adapter VaultExport.tsx

```typescript
import { isElectron, getElectronAPI } from '../lib/electronDetection';

const handleExport = async () => {
  const vaultData = JSON.stringify({ entries, settings });
  
  if (isElectron()) {
    const electronAPI = getElectronAPI();
    const result = await electronAPI.vault.exportToFile(vaultData);
    
    if (result.success) {
      alert(`✅ Vault exporté vers:\n${result.path}`);
    } else {
      alert(`❌ Erreur: ${result.error}`);
    }
  } else {
    // Fallback web : download via blob
    const blob = new Blob([vaultData]);
    // ...
  }
};
```

### Écouter les événements menu

**Dans VaultDashboard.tsx :**

```typescript
useEffect(() => {
  if (isElectron()) {
    const electronAPI = getElectronAPI();
    
    electronAPI.vault.onLock(() => {
      console.log('🔒 Lock demandé par le menu');
      handleLock();
    });
    
    electronAPI.vault.onExport(() => {
      console.log('💾 Export demandé par le menu');
      handleExport();
    });
    
    electronAPI.vault.onImport(() => {
      console.log('📥 Import demandé par le menu');
      handleImport();
    });
    
    return () => {
      // Cleanup listeners
    };
  }
}, []);
```

---

## 📋 TODO immédiat

### 1. Créer les icônes ⚠️ PRIORITÉ 1

- [ ] Créer `icon.png` (512x512)
- [ ] Générer `icon.ico` et `icon.icns`
- [ ] Placer dans `resources/icons/`

### 2. Implémenter détection Electron

- [ ] Créer `electronDetection.ts`
- [ ] Adapter `VaultExport.tsx`
- [ ] Adapter `VaultImport.tsx`
- [ ] Écouter événements menu dans `VaultDashboard.tsx`

### 3. Tester fonctionnalités Electron

- [ ] Tester menu "Verrouiller" (Ctrl+L)
- [ ] Tester menu "Export" (Ctrl+E)
- [ ] Tester menu "Import" (Ctrl+I)
- [ ] Tester raccourcis clavier

### 4. Décider architecture production

- [ ] Option 1 : Serveur Next.js embarqué (complexe mais complet)
- [ ] Option 2 : Export statique partiel (simple mais limité)

---

## 🐛 Problèmes connus

### ESLint/TypeScript désactivés

**Status** : ⚠️ Temporaire pour permettre le build

**À faire** :

- Corriger les erreurs `@typescript-eslint/no-explicit-any`
- Corriger les erreurs React hooks
- Réactiver ESLint : `ignoreDuringBuilds: false`

### Routes API incompatibles avec export statique

**Status** : ⚠️ Bloquant pour build production

**Solutions** :

1. Serveur Next.js embarqué (recommandé)
2. Migrer la logique API vers IPC handlers Electron
3. Créer une version vault-only sans API

### localStorage dans Electron

**Status** : ✅ Fonctionne automatiquement

**Chemin** :

- Windows : `%APPDATA%\Cryptos Coffre\Local Storage`
- macOS : `~/Library/Application Support/Cryptos Coffre/Local Storage`
- Linux : `~/.config/Cryptos Coffre/Local Storage`

---

## 🎯 Prochaines étapes suggérées

### Court terme (cette semaine)

1. **Créer les icônes** (2h)
2. **Implémenter détection Electron** (1h)
3. **Tester menu et raccourcis** (30min)

### Moyen terme (ce mois)

4.**Décider architecture prod** (discussion)
5. **Implémenter serveur Next.js embarqué** OU **version statique** (1-2 jours)
6. **Build et test Windows .exe** (1 jour)

### Long terme (next)

7.**Code signing Windows** (certificat requis)
8. **Build macOS .dmg** (nécessite macOS)
9. **Build Linux AppImage** (peut se faire sur Windows via Docker)
10. **Auto-update avec GitHub Releases**

---

## 📞 Support

- **Docs Electron** : `https://www.electronjs.org/docs`
- **Docs Next.js** : `https://nextjs.org/docs`
- **electron-vite** : `https://github.com/alex8088/electron-vite`

---

**Status** : 🟡 Développement en cours
**Prêt pour prod** : ❌ Non (icônes manquantes, architecture à finaliser)
**Prêt pour dev** : ✅ Oui (serveurs lancés, Electron fonctionne)
