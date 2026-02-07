# 🚀 Guide de Démarrage Rapide - Electron Vault

## ✅ État actuel (3 février 2026)

- ✅ **Interface standalone** : Coffre sans Header/Sidebar
- ✅ **Page de reset** : `/electron/vault/reset`
- ✅ **Page d'init** : `/electron/vault/init`
- ✅ **Boutons de diagnostic** : Accessibles depuis déverrouillage et init
- ✅ **localStorage** : Propre à Electron (séparé du navigateur)

---

## 🔧 PROBLÈME RÉSOLU : "Passphrase incorrecte"

### Cause

Le localStorage d'Electron contenait `vault_salt` mais pas les données du coffre (qui étaient dans le navigateur).

### Solution

3 nouvelles fonctionnalités ajoutées :

#### 1️⃣ **Page de diagnostic** : `/electron/vault/reset`

- Affiche toutes les clés `vault_*` du localStorage
- Bouton "Réinitialiser le coffre" (supprime tout)
- Accessible via URL directe ou boutons dans l'interface

#### 2️⃣ **Bouton dans le déverrouillage**

- Si vous êtes sur l'écran "Entrez votre passphrase"
- Nouveau bouton : **🔧 Réinitialiser le coffre**
- Visible UNIQUEMENT dans Electron (détection `window.electronAPI`)

#### 3️⃣ **Alert dans l'init**

- Si `vault_salt` existe déjà
- Affiche : ⚠️ "Un coffre existe déjà"
- Bouton : **🔧 Réinitialiser d'abord**

---

## 📋 PROCÉDURE DE RÉINITIALISATION

### Option A : Via l'interface de déverrouillage

1. **Ouvrez Electron** → Écran "Entrez votre passphrase"
2. **Cliquez sur** : 🔧 **Réinitialiser le coffre**
3. **Confirmez** : Toutes les données seront supprimées
4. **Redirection automatique** vers `/electron/vault/init`
5. **Créez un nouveau coffre**

### Option B : Via la page de diagnostic

1. **Dans la barre d'adresse Electron** (F12 → Console) :

   ```javascript
   window.location.href = '/electron/vault/reset';
   ```

2. **Ou ajoutez un raccourci menu** (à venir)
3. **Cliquez** : 🔍 **Vérifier le localStorage**
4. **Voyez les clés** existantes
5. **Cliquez** : 🗑️ **Réinitialiser le coffre**
6. **Redirection** vers `/electron/vault/init`

### Option C : Via DevTools Console

1. **Ouvrez DevTools** : F12 dans Electron
2. **Console** :

   ```javascript
   // Supprimer toutes les clés vault_*
   Object.keys(localStorage)
     .filter(k => k.startsWith('vault_'))
     .forEach(k => localStorage.removeItem(k));
   
   // Recharger
   window.location.reload();
   ```

---

## 🎯 WORKFLOW RECOMMANDÉ

### Pour créer votre premier coffre Electron

1. **Réinitialisez** (via bouton ou page `/reset`)
2. **Accédez à** `/electron/vault/init`
3. **Créez une passphrase** (min. 12 caractères)
   - Conseil : Utilisez le générateur 🎲
   - Exemple : `Elephant$Blue#2026Mountain!`
4. **Confirmez la passphrase**
5. **Cliquez** : 🚀 **Créer le coffre**
6. **Sauvegardez les codes de récupération** (affichés après)

### Pour migrer depuis le navigateur

1. **Dans le navigateur** `(http://localhost:3000/fr/vault)` :
   - Déverrouillez votre coffre
   - Menu → **Export coffre** → **Exporter en .vault**
   - Sauvegardez : `mon-coffre-backup.vault`

2. **Dans Electron** :
   - Réinitialisez le localStorage
   - Créez un nouveau coffre OU
   - Utilisez **Import** (menu Ctrl+I) → Sélectionnez le `.vault`

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Réinitialisation

- [ ] Ouvrir Electron
- [ ] Cliquer sur "🔧 Réinitialiser le coffre"
- [ ] Confirmer
- [ ] Vérifier redirection vers `/init`

### Test 2 : Création de coffre

- [ ] Sur `/electron/vault/init`
- [ ] Générer une passphrase avec 🎲
- [ ] Confirmer
- [ ] Cliquer "Créer le coffre"
- [ ] Vérifier redirection vers `/electron/vault`

### Test 3 : Déverrouillage

- [ ] Fermer et rouvrir Electron
- [ ] Entrer la passphrase
- [ ] Vérifier déverrouillage réussi
- [ ] Voir le dashboard sans erreur

### Test 4 : Création d'entrée

- [ ] Coffre déverrouillé
- [ ] Cliquer "➕ Nouvelle entrée"
- [ ] Remplir les champs
- [ ] Sauvegarder
- [ ] Vérifier persistance (fermer/rouvrir)

### Test 5 : Export/Import

- [ ] Export : Ctrl+E (menu)
- [ ] Vérifier fichier `.vault` créé
- [ ] Réinitialiser le coffre
- [ ] Import : Ctrl+I
- [ ] Vérifier données restaurées

---

## 🐛 DÉPANNAGE

### "Impossible de créer le coffre"

→ Réinitialisez via `/electron/vault/reset`

### "Passphrase incorrecte"

→ Vérifiez que vous utilisez la bonne passphrase OU réinitialisez

### "Page blanche"

→ F12 → Console → Vérifiez les erreurs JavaScript

### "localStorage vide mais page init bloquée"

→ DevTools Console :

```javascript
localStorage.clear();
window.location.href = '/electron/vault/init';
```

---

## 📂 FUTURE AMÉLIORATION

### Fichier .vault sur le disque (à implémenter)

**Objectif** : Stocker le coffre dans un fichier au lieu de localStorage

**Architecture proposée** :

```plan
C:\Users\[User]\Documents\Cryptos Coffre\
├── config.json (chemin du fichier actif)
└── vaults\
    ├── principal.vault
    ├── travail.vault
    └── perso.vault
```

**Avantages** :

- ✅ Sauvegarde facile (copier le fichier)
- ✅ Synchronisation cloud native
- ✅ Pas de limite de taille localStorage
- ✅ Import/Export automatique

**IPC requis** :

- `vault:set-file-path` : Définir le fichier actif
- `vault:read-file` : Lire le .vault
- `vault:write-file` : Écrire le .vault
- `vault:auto-save` : Sauvegarde automatique

**Fichiers à modifier** :

- `main/ipc/vault.ts` : Ajouter handlers file I/O
- `ressource/hooks/useVault.ts` : Adapter pour fichier au lieu de localStorage
- `app/electron/vault/page.tsx` : Demander chemin au démarrage

---

## 📝 COMMANDES UTILES

### Vérifier le localStorage (Console)

```javascript
// Lister toutes les clés
Object.keys(localStorage).filter(k => k.startsWith('vault_'));

// Voir le salt
localStorage.getItem('vault_salt');

// Voir les données (chiffrées)
localStorage.getItem('vault_data');

// Supprimer tout
Object.keys(localStorage)
  .filter(k => k.startsWith('vault_'))
  .forEach(k => localStorage.removeItem(k));
```

### Redémarrer Electron proprement

```powershell
# Arrêter tous les processus
Stop-Process -Name "node","electron" -Force -ErrorAction SilentlyContinue

# Attendre 2 secondes
Start-Sleep -Seconds 2

# Relancer Next.js
cd E:\Cryptos-Services
npm run dev

# Attendre 3 secondes
Start-Sleep -Seconds 3

# Relancer Electron
cd E:\Cryptos-Coffre-Desktop
npm run dev
```

---

## ✅ CHECKLIST DE VALIDATION

- [ ] localStorage Electron propre
- [ ] Nouveau coffre créé
- [ ] Passphrase fonctionne
- [ ] Au moins 3 entrées de test
- [ ] Export .vault réussi
- [ ] Import .vault réussi
- [ ] Menus IPC testés (Ctrl+L, Ctrl+E, Ctrl+I)
- [ ] Fermeture/Ouverture : données persistantes

---

**Date** : 3 février 2026
**Status** : 🟢 Opérationnel pour développement
**Prêt pour prod** : 🟡 Oui avec localStorage, ⚪ Non avec fichier .vault (à implémenter)
