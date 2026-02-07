# 📝 Guide : Créer manuellement un fichier .vault

## ⚠️ ATTENTION : Solution temporaire

Cette méthode est une **solution de contournement** car le bouton de réinitialisation ne fonctionne pas encore.

**Méthode recommandée** : Utiliser l'interface après correction du bug.

---

## 📦 Format du fichier `.vault`

**Extension** : `.vault` (mais c'est du **JSON**)

**Type** : Fichier JSON structuré

**Encodage** : UTF-8

---

## 🏗️ Structure minimale

```json
{
  "version": "1.0",
  "exportDate": "2026-02-03T12:00:00.000Z",
  "vault": {
    "salt": "VOTRE_SALT_BASE64_ICI",
    "entries": [],
    "folders": []
  },
  "security": {
    "lockoutDuration": 300000,
    "maxAttempts": 5,
    "autoLockDelay": 900000,
    "requireWebAuthn": false,
    "requireTOTP": false,
    "webAuthnEnabled": false,
    "totpEnabled": false,
    "passphraseHint": ""
  },
  "audit": []
}
```

---

## 🔑 Étape 1 : Récupérer le `salt` du navigateur

Le `salt` est stocké dans le localStorage du navigateur web.

### Via Console Chrome/Edge/Firefox

1. **Ouvrez votre navigateur** (Chrome, Edge, Firefox)
2. **Allez sur** : `http://localhost:3000/fr/vault`
3. **Ouvrez DevTools** : F12 ou Clic droit → Inspecter
4. **Onglet Console**
5. **Tapez** :

   ```javascript
   localStorage.getItem('vault_salt')
   ```

6. **Résultat** : Une chaîne Base64, par exemple :

   ```exemple
   "nK8pL2mR5tQ9wX3yZ1aB7cD4eF6gH8iJ0kL2mN4oP6qR8sT0uV2wX4yZ6"
   ```

7. **Copiez cette valeur** (avec les guillemets)

---

## 📄 Étape 2 : Créer le fichier

### Option A : Copier le template

1. **Utilisez le fichier** : `TEMPLATE-mon-coffre.vault`
2. **Remplacez** `"VOTRE_SALT_BASE64_ICI"` par votre salt
3. **Exemple** :

   ```json
   "salt": "nK8pL2mR5tQ9wX3yZ1aB7cD4eF6gH8iJ0kL2mN4oP6qR8sT0uV2wX4yZ6"
   ```

### Option B : Créer depuis zéro

1. **Créez un fichier** : `mon-coffre.vault`
2. **Ouvrez avec** : Notepad++ / VS Code / Notepad
3. **Collez** la structure JSON ci-dessus
4. **Remplacez** le salt

---

## ⚙️ Étape 3 : Ajuster les paramètres (optionnel)

### Champs importants

| Champ | Description | Valeur par défaut | Peut changer |

|-------|-------------|-------------------|--------------|
| `version` | Version du format | `"1.0"` | ❌ Ne pas modifier |
| `exportDate` | Date d'export | ISO 8601 | ✅ Optionnel |
| `vault.salt` | **ESSENTIEL** | Base64 | ✅ **REQUIS** |
| `vault.entries` | Entrées chiffrées | `[]` | ✅ Vide au début |
| `vault.folders` | Dossiers | `[]` | ✅ Vide au début |
| `security.maxAttempts` | Tentatives max | `5` | ✅ Modifiable |
| `security.autoLockDelay` | Verrouillage auto (ms) | `900000` (15 min) | ✅ Modifiable |
| `security.passphraseHint` | Indice passphrase | `""` | ✅ Optionnel |

### Exemple avec indice

```json
"security": {
  "lockoutDuration": 300000,
  "maxAttempts": 5,
  "autoLockDelay": 900000,
  "requireWebAuthn": false,
  "requireTOTP": false,
  "webAuthnEnabled": false,
  "totpEnabled": false,
  "passphraseHint": "Prénom de mon chat + année de naissance"
}
```

---

## 💾 Étape 4 : Enregistrer le fichier

### Paramètres d'enregistrement

- **Nom** : `mon-coffre.vault` (ou autre nom)
- **Type** : `Tous les fichiers (*.*)` ou `.vault`
- **Encodage** : UTF-8 (important !)
- **Emplacement** : Documents, Desktop, etc.

### ⚠️ Vérification

Le fichier doit :

- ✅ Se terminer par `.vault`
- ✅ Être lisible en JSON (ouvrir avec Notepad)
- ✅ Contenir le `salt` du navigateur
- ✅ Avoir une structure valide (pas de virgules manquantes)

---

## 📥 Étape 5 : Importer dans Electron

### Méthode 1 : Via l'interface (si elle fonctionne)

1. **Ouvrez Electron**
2. **Page de déverrouillage** ou **Page d'init**
3. **Cliquez** : "📤 Importer"
4. **Sélectionnez** : `mon-coffre.vault`
5. **Entrez** : Passphrase du navigateur (celle utilisée pour créer le coffre)

### Méthode 2 : Via DevTools (si import bloqué)

1. **Ouvrez Electron**
2. **F12** → Console
3. **Collez** :

   ```javascript
   // Lire le fichier (vous devrez le coller manuellement)
   const importData = {
     "version": "1.0",
     "vault": {
       "salt": "VOTRE_SALT_ICI",
       "entries": [],
       "folders": []
     },
     "security": { /* ... */ },
     "audit": []
   };

   // Restaurer dans localStorage
   localStorage.setItem('vault_salt', importData.vault.salt);
   localStorage.setItem('security-settings', JSON.stringify(importData.security));
   
   // Recharger
   window.location.reload();
   ```

### Méthode 3 : Restauration manuelle localStorage

**La plus simple pour débloquer** :

1. **Ouvrez Electron**
2. **F12** → Console
3. **Tapez** :

   ```javascript
   // Remplacez par VOTRE salt du navigateur
   localStorage.setItem('vault_salt', 'nK8pL2mR5tQ9wX3yZ1aB7cD4eF6gH8iJ0kL2mN4oP6qR8sT0uV2wX4yZ6');
   
   // Recharger
   window.location.reload();
   ```

---

## 🧪 Étape 6 : Tester

1. **Page d'init ou déverrouillage** devrait apparaître
2. **Entrez** : La passphrase utilisée dans le navigateur
3. **Si succès** : Le coffre s'ouvre (vide car `entries: []`)
4. **Si échec** : Le salt ne correspond pas à la passphrase

---

## ❓ FAQ

### Le salt est-il secret ?

**Non**, le salt peut être public. Il sert à renforcer le hachage, pas à chiffrer.

**Secret = Passphrase** (à ne JAMAIS écrire dans le fichier .vault)

### Puis-je ajouter des entrées manuellement ?

**Non recommandé**. Les entrées sont **chiffrées**. Vous devrez :

1. Créer des entrées via l'interface
2. Exporter à nouveau

### Pourquoi le fichier est vide (entries: []) ?

C'est normal pour un **nouveau coffre**. Les entrées seront ajoutées via l'interface.

### Où trouver mon salt si je n'ai pas le navigateur ?

**Impossible**. Le salt est généré aléatoirement lors de l'init. Sans accès au localStorage du navigateur, vous devez :

1. Créer un **nouveau coffre** dans Electron
2. Noter la passphrase

---

## 🚀 Après import réussi

Une fois le salt restauré :

1. **Créez des entrées** dans Electron
2. **Testez Export** : Menu → Export
3. **Sauvegardez** le fichier `.vault` exporté
4. **Testez Import** : Réinitialiser → Importer

---

## 🔧 Correction du bug

**TODO pour le développeur** :

Le bouton "Réinitialiser le coffre" ne fonctionne pas car :

- Page `/electron/vault/reset` non accessible
- Ou bouton dans VaultDashboard non affiché

**Actions requises** :

1. Vérifier que la route `/electron/vault/reset` compile
2. Vérifier la détection `window.electronAPI`
3. Ajouter un menu "Diagnostic" dans Electron

---

## 📋 Checklist finale

- [ ] Salt récupéré du navigateur
- [ ] Fichier `.vault` créé avec le salt
- [ ] Fichier enregistré en UTF-8
- [ ] JSON valide (pas d'erreurs de syntaxe)
- [ ] Salt collé dans Electron (Console)
- [ ] Passphrase testée
- [ ] Coffre déverrouillé

---

**Date** : 3 février 2026
**Status** : Workaround temporaire
**Prochaine étape** : Corriger le bouton de reset dans Electron
