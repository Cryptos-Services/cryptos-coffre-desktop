# 🔐 Cryptos Coffre Desktop - Configuration

## Structure des dossiers

Ce fichier explique l'organisation du projet et comment intégrer le build de Cryptos-Services.

---

## 📁 Dossiers importants

### `dist-web/`

**Contient le build statique de Cryptos-Services** ':'

Ce dossier **doit être créé** en copiant le build depuis `E:\Cryptos-Services\out\` :

```bash
npm run copy-web
```

Ou manuellement :

```bash
cd E:\Cryptos-Services
npm run build

# Copier out/ vers E:\Cryptos-Coffre-Desktop\dist-web\
```

### `resources/icons/`

Icônes de l'application (requis pour les builds) :

- `icon.ico` (Windows)
- `icon.png` (Linux, 512x512)
- `icon.icns` (macOS)

### `resources/installer/`

Assets pour les installateurs :

- `header.bmp` (NSIS header, 150x57)
- `background.png` (DMG background, 540x380)

---

## 🔧 Configuration requise

### 1. Build Cryptos-Services

Avant de lancer Electron, buildez Cryptos-Services :

```bash
cd E:\Cryptos-Services
npm run build
```

Cela crée `out/` avec :

- HTML statique
- CSS/JS bundlés
- Assets optimisés

### 2. Copier le build

```bash
cd E:\Cryptos-Coffre-Desktop
npm run copy-web
```

### 3. Vérifier

```bash
dir dist-web
# Doit contenir index.html, _next/, etc.
```

---

## ⚙️ Variables d'environnement

Créez `.env` (optionnel) :

```env
# Mode développement
NODE_ENV=development

# URL du serveur Next.js en dev
DEV_SERVER_URL=http://localhost:3000/ressource/pages/vault-dashboard

# GitHub pour auto-update
GH_TOKEN=your_github_token_here
```

---

## 🚀 Workflow de développement

### Développement

1. Lancer Cryptos-Services : `npm run dev` (port 3000)
2. Dans Cryptos-Coffre-Desktop : `npm run dev`
3. Electron charge `http://localhost:3000`

### Production

1. Build Cryptos-Services : `npm run build`
2. Copier : `npm run copy-web`
3. Build Electron : `npm run build:win` (ou mac/linux)
4. Binaire dans `release/`

---

## 📦 Build multi-plateforme

### Windows (depuis Windows)

```bash
npm run build:win
```

Crée :

- `Cryptos-Coffre-1.0.0-x64.exe` (NSIS installer)
- `Cryptos-Coffre-1.0.0-x64.exe` (Portable)

### macOS (depuis macOS)

```bash
npm run build:mac
```

Crée :

- `Cryptos-Coffre-1.0.0.dmg`
- `Cryptos-Coffre-1.0.0-mac.zip`

### Linux (depuis Linux/macOS/Windows)

```bash
npm run build:linux
```

Crée :

- `Cryptos-Coffre-1.0.0.AppImage`
- `cryptos-Coffre.0.0_amd64.deb`
- `cryptos-Coffre-1.0.0.x86_64.rpm`

---

## 🔐 Certificats (pour signature)

### Windows

Code signing certificate (.pfx) :

```env
CSC_LINK=path/to/certificate.pfx
CSC_KEY_PASSWORD=your_password
```

### macOS

Developer ID certificate :

```env
APPLE_ID=your@email.com
APPLE_ID_PASSWORD=app-specific-password
CSC_LINK=Developer ID Application: Your Name (TEAM_ID)
```

---

## 📋 Checklist avant release

- [ ] Build Cryptos-Services à jour
- [ ] `dist-web/` copié et vérifié
- [ ] Icônes présentes (`resources/icons/`)
- [ ] Version bumped (`package.json`)
- [ ] CHANGELOG.md à jour
- [ ] Tests manuels (install, uninstall, update)
- [ ] Certificats configurés
- [ ] Build signé et notarisé (macOS)

---

## 🆘 Troubleshooting

### "Build web introuvable"

→ Exécutez `npm run copy-web` d'abord

### "Cannot find module 'electron'"

→ Exécutez `npm install`

### Fenêtre blanche au démarrage

→ Vérifiez que `dist-web/index.html` existe
→ Ouvrez DevTools (F12) et regardez les erreurs

### Auto-update ne fonctionne pas

→ L'app doit être signée
→ GitHub Releases doit contenir le fichier `.yml`

---

## 📞 Support

- **Docs** : `https://cryptos-services.com/docs`
- **Issues** : `https://github.com/cryptos-services/cryptos-coffre-desktop/issues`
- **Email** : `support@cryptos-services.com`
