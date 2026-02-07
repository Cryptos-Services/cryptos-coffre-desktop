# 🎨 Icônes de l'application

Ce dossier doit contenir les icônes de Cryptos Coffre pour chaque plateforme.

## 📋 Fichiers requis

### `icon.png` (Linux)

- Format : PNG
- Taille : **512x512 pixels**
- Transparent : Oui (recommandé)

### `icon.ico` (Windows)

- Format : ICO multi-résolution
- Tailles incluses : 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- Peut être généré depuis icon.png

### `icon.icns` (macOS)

- Format : ICNS
- Tailles incluses : 16x16@1x/2x, 32x32@1x/2x, 128x128@1x/2x, 256x256@1x/2x, 512x512@1x/2x
- Peut être généré depuis icon.png

## 🛠️ Génération automatique

Si vous avez seulement `icon.png` (512x512), utilisez ces outils :

### Windows (.ico)

```bash
# Avec ImageMagick
magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# Ou en ligne : https://convertio.co/png-ico/
```

### macOS (.icns)

```bash
# Créer l'iconset
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png

# Convertir en .icns
iconutil -c icns icon.iconset
```

### Ou utilisez electron-icon-builder

```bash
npm install -g electron-icon-builder
electron-icon-builder --input=icon.png --output=./
```

## 🎨 Design recommandé

Pour Cryptos Coffre, l'icône devrait :

- Représenter un coffre-fort 🔐 ou un cadenas 🔒
- Utiliser les couleurs de la marque :
  - Violet principal : `#5e17eb`
  - Jaune accent : `#ffde59`
- Être simple et reconnaissable même en petit (16x16)
- Avoir un fond transparent pour s'adapter aux thèmes

## 📦 Structure finale

```plan
resources/icons/
├── icon.png      ← Source 512x512
├── icon.ico      ← Windows
└── icon.icns     ← macOS
```

## ⚠️ IMPORTANT

**Sans ces icônes, le build échouera !**

Si vous n'avez pas encore d'icône, utilisez une icône placeholder temporaire ou générez-en une avec :

- `https://www.flaticon.com/` (🔐 vault/lock icons)
- `https://www.canva.com/` (création personnalisée)
- `https://www.figma.com/` (design professionnel)
