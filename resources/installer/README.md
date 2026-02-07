# 📦 Assets d'installateur

Ce dossier contient les images utilisées par les installateurs Windows (NSIS) et macOS (DMG).

## 📋 Fichiers requis

### `header.bmp` (NSIS - Windows)

- **Format** : BMP (24-bit, non compressé)
- **Taille** : **150 x 57 pixels** (fixe, ne pas modifier)
- **Usage** : En-tête de l'installateur NSIS
- **Design** : Logo + texte "Cryptos Coffre" horizontal

### `background.png` (DMG - macOS)

- **Format** : PNG
- **Taille** : **540 x 380 pixels** (recommandé)
- **Usage** : Fond de la fenêtre d'installation DMG
- **Design** : Background avec zones pour icône app + dossier Applications

## 🎨 Créer les assets

### Header NSIS (Windows)

```txt
[150 x 57 pixels]
┌────────────────────────────┐
│  🔐  Cryptos Coffre         │  ← Logo + Texte
│      Coffre-Fort Sécurisé  │
└────────────────────────────┘
```

**Outils** :

- Photoshop/GIMP/Figma
- Fond dégradé violet (#5e17eb → #030121)
- Logo 48x48 + texte blanc

**Convertir en BMP** :

```bash
# Avec ImageMagick
magick convert header.png -type truecolor header.bmp
```

### Background DMG (macOS)

```plan
[540 x 380 pixels]
┌──────────────────────────────┐
│                              │
│   🔐                📁       │  ← Icône app + Applications
│  Drop here      Applications │
│                              │
│   Cryptos Coffre              │
│   Coffre-Fort Sécurisé       │
└──────────────────────────────┘
```

**Positions** (configurées dans electron-builder.yml) :

- Icône app : x=130, y=180
- Dossier Applications : x=380, y=180

## 🛠️ Génération rapide

Si vous n'avez pas les outils, utilisez ces placeholders :

### Header.bmp (Windows)

```bash
magick convert -size 150x57 xc:"#5e17eb" \
  -font Arial -pointsize 12 -fill white \
  -annotate +10+30 "Cryptos Coffre" \
  header.bmp
```

### Background.png (macOS)

```bash
magick convert -size 540x380 \
  gradient:"#5e17eb-#030121" \
  -font Arial -pointsize 24 -fill white \
  -annotate +150+350 "Glissez l'icône vers Applications" \
  background.png
```

## 📦 Structure finale

```plan
resources/installer/
├── header.bmp         ← NSIS header (150x57)
└── background.png     ← DMG background (540x380)
```

## ⚠️ Notes importantes

1. **BMP doit être 24-bit non compressé** (NSIS ne supporte pas les autres formats)
2. La taille du header est **strictement 150x57**, pas d'autre taille acceptée
3. Le background DMG peut être plus grand, mais 540x380 est le standard

## 🎨 Templates recommandés

Pour un design professionnel, inspirez-vous de :

- 1Password (bleu marine + blanc)
- Bitwarden (bleu profond + icônes claires)
- KeePass (vert + cadenas)

### Couleurs Cryptos Coffre

- Violet principal : `#5e17eb`
- Violet foncé : `#030121`
- Jaune accent : `#ffde59`
- Blanc : `#ffffff`

## 🚀 Sans ces fichiers

Electron-builder peut fonctionner sans ces assets, mais :

- L'installateur aura un aspect générique
- L'expérience utilisateur sera moins professionnelle
- Recommandé pour une release publique
