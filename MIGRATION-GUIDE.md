# 🔐 Guide de Migration du Coffre vers Electron

## Problème : Passphrase incorrecte dans Electron

### 🤔 Pourquoi ?

Electron et votre navigateur web utilisent des **espaces de stockage localStorage complètement séparés** :

| Plateforme | Chemin du localStorage |

|-----------|------------------------|
| **Chrome/Edge** | `C:\Users\[User]\AppData\Local\Google\Chrome\User Data\Default\Local Storage` |
| **Firefox** | `C:\Users\[User]\AppData\Roaming\Mozilla\Firefox\Profiles\[xxx].default\storage` |
| **Electron** | `C:\Users\[User]\AppData\Roaming\Cryptos Coffre\Local Storage` |

**Résultat** : Le coffre créé dans le navigateur n'existe pas dans Electron, ce sont deux environnements distincts.

---

## ✅ Solution 1 : Créer un nouveau coffre dans Electron (RECOMMANDÉ)

1. **Dans Electron** : Cliquez sur "Créer un nouveau coffre"
2. **Choisissez une nouvelle passphrase maître**
3. **Sauvegardez les codes de récupération** (très important !)

> ⚠️ Ce sera un coffre indépendant de celui du navigateur web.

---

## 📦 Solution 2 : Migrer votre coffre existant

### Étape 1 : Exporter depuis le navigateur

1. Ouvrez `http://localhost:3000/fr/vault` dans votre **navigateur web** (Chrome/Firefox/Edge)
2. Déverrouillez votre coffre avec votre passphrase
3. Cliquez sur **"Export coffre"** → **"Exporter en .vault"**
4. Sauvegardez le fichier (ex: `mon-coffre-2026-02-03.vault`)

### Étape 2 : Importer dans Electron

1. Ouvrez **Electron Cryptos Coffre**
2. Sur la page d'initialisation, cliquez sur **"Importer un coffre existant"**
3. Sélectionnez le fichier `.vault` exporté
4. Entrez la **passphrase d'origine** (celle du navigateur)

> ✅ Vos entrées seront maintenant accessibles dans Electron !

---

## 🔄 Solution 3 : Synchroniser les deux environnements

### Option A : Workflow Import/Export manuel

**Avantages** :

- ✅ Sécurité maximale (aucune synchronisation automatique)
- ✅ Contrôle total sur les données

**Inconvénients** :

- ❌ Doit exporter/importer manuellement à chaque modification

### Option B : Fichier .vault partagé (à venir)

**Architecture future** :

```txt
C:\Users\[User]\Documents\Cryptos Coffre\
└── mon-coffre.vault (fichier chiffré unique)
```

- **Navigateur web** : Lit/Écrit dans ce fichier
- **Electron** : Lit/Écrit dans ce fichier
- **Synchronisation** : OneDrive / Dropbox / Google Drive

> 🚧 Cette fonctionnalité n'est pas encore implémentée.

---

## 🎯 Recommandations

### Pour tester Electron (maintenant) ':'

👉 **Créez un nouveau coffre** avec quelques entrées de test

### Pour une utilisation réelle ':'

1. **Exportez votre coffre web** → `.vault`
2. **Importez dans Electron**
3. Utilisez **Electron comme environnement principal**
4. Exportez régulièrement vers un emplacement sauvegardé

---

## 🛡️ Sécurité

### Pourquoi des environnements séparés ?

C'est en réalité un **avantage de sécurité** :

- ✅ Si le navigateur est compromis → Electron reste protégé
- ✅ Isolement total des données
- ✅ Pas d'accès cross-domain

### Bonnes pratiques ':'

1. **Sauvegardez régulièrement** en `.vault`
2. **Codes de récupération** : Imprimez-les et rangez-les en lieu sûr
3. **Passphrase forte** : Min. 16 caractères, mélange symboles/chiffres/lettres

---

## 📸 Interface Electron vs Web

### Différence clé ':'

| Version Web | Version Electron |

|------------|------------------|
| ✅ Header Cryptos Services | ❌ Pas de header |
| ✅ Sidebars (gauche/droite) | ❌ Pas de sidebars |
| ✅ Footer | ❌ Pas de footer |
| ✅ Chatbot | ❌ Pas de chatbot |
| 🎯 **Coffre + Navigation** | 🎯 **Coffre uniquement** |

**URL** :

- Web : `http://localhost:3000/fr/vault` (avec layout complet)
- Electron : `http://localhost:3000/electron/vault` (standalone)

---

## 🔧 Tests effectués

✅ Route `/electron/vault` créée et fonctionnelle
✅ Layout dédié sans Header/Footer/Sidebar
✅ Compilation Next.js : `✓ Compiled /electron/vault in 2.8s`
✅ Electron charge correctement la nouvelle URL
✅ IPC handlers actifs (vault, crypto)

---

## 📝 Prochaines étapes

Après avoir résolu le localStorage :

1. **Tester les fonctionnalités** :
   - [ ] Créer une entrée
   - [ ] Modifier une entrée
   - [ ] Supprimer une entrée
   - [ ] Rechercher dans le coffre
   - [ ] Générer un mot de passe

2. **Tester les raccourcis IPC** :
   - [ ] **Ctrl+L** → Verrouiller le coffre
   - [ ] **Ctrl+E** → Exporter via dialogue natif
   - [ ] **Ctrl+I** → Importer via dialogue natif

3. **Tester les menus** :
   - [ ] Menu "Fichier" → Export/Import
   - [ ] Menu "Aide" → À propos

---

## 🆘 Besoin d'aide ?

- **Erreur "Passphrase incorrecte"** → Créez un nouveau coffre OU importez depuis le navigateur
- **404 Page not found** → Vérifiez que Next.js est sur le port 3000
- **Fenêtre Electron blanche** → Vérifiez les DevTools (F12) pour les erreurs
- **Données manquantes** → Exportez depuis le navigateur, importez dans Electron

---

**Date** : 3 février 2026
**Version** : Electron 1.0.0 (dev)
**Status** : ✅ Interface standalone fonctionnelle, localStorage à configurer
