# 🧪 Guide de Tests - Migration Complète

## ✅ Migration Terminée '!'

Tous les appels API ont été convertis en opérations localStorage. Voici comment tester l'application.

---

## 🚀 Démarrage Rapide

### 1. Nettoyage complet (recommandé)

```powershell
# Dans le terminal
npm run dev
```

Puis dans l'application Electron :

- Ouvrez DevTools (F12)
- Console : `localStorage.clear()`
- Rechargez (Ctrl+R)

### 2. Créer un nouveau coffre

1. **Générer une passphrase** : Cliquez sur "🎲 Générer une passphrase sécurisée"
2. **Copiez-la** (ex: `X7k#mP2qL9@wRt5vN8cS4bF1`)
3. **Créez le coffre** : Cliquez sur "🚀 Créer mon coffre"
4. ✅ **Succès** : Vous devez arriver sur le dashboard

---

## 📋 Tests de Base (CRITIQUES)

### Test 1 : Déverrouillage

- [ ] **Lock** : Ctrl+L ou Menu Fichier → Verrouiller
- [ ] **Unlock** : Entrez votre passphrase
- [ ] ✅ **Succès** : Vous revenez au dashboard

**Échec ?** → Ouvrez DevTools, vérifiez :

```javascript
localStorage.getItem('vault_salt') // Doit être en base64 (ex: "aBcD...")
localStorage.getItem('vault_data') // Doit être "[]" ou JSON array
```

---

### Test 2 : Ajouter une entrée

1. **Cliquez** sur "➕ Nouvelle entrée"
2. **Remplissez** :
   - Type : `password`
   - Nom : `Test Gmail`
   - Username : `test@gmail.com`
   - Password : `MonMotDePasse123!`
3. **Sauvegardez**
4. ✅ **Succès** : L'entrée apparaît dans la liste

**Vérification localStorage** :

```javascript
JSON.parse(localStorage.getItem('vault_data'))
// Doit contenir 1 objet avec encryptedData, iv, id, etc.
```

---

### Test 3 : Modifier une entrée

1. **Cliquez** sur l'entrée "Test Gmail"
2. **Modifiez** le password : `NouveauMotDePasse456!`
3. **Sauvegardez**
4. ✅ **Succès** : Le password est mis à jour

**Vérification** : Affichez le password → doit être `NouveauMotDePasse456!`

---

### Test 4 : Supprimer une entrée

1. **Sélectionnez** l'entrée
2. **Cliquez** sur le bouton supprimer (🗑️)
3. **Confirmez**
4. ✅ **Succès** : L'entrée disparaît

**Vérification localStorage** :

```javascript
JSON.parse(localStorage.getItem('vault_data')).length
// Doit être 0
```

---

## 🔐 Tests de Sécurité (IMPORTANTS)

### Test 5 : Codes de Récupération

1. **Ouvrez** "🔒 Sécurité" (sidebar)
2. **Cliquez** "Générer de nouveaux codes"
3. **Entrez** votre passphrase
4. ✅ **Succès** : 5 codes affichés (ex: `ABCD-1234-EFGH-5678`)
5. **Copiez** le premier code

**Si erreur JSON** → Problème résolu ! Ce test devrait passer maintenant.

---

### Test 6 : Utilisation d'un Code de Récupération

1. **Verrouillez** le coffre (Ctrl+L)
2. **Sur la page unlock** : Cliquez "❓ Mot de passe oublié ?"
3. **Entrez** les 5 codes de récupération (un par ligne)
4. **Choisissez** une nouvelle passphrase
5. ✅ **Succès** : Coffre déverrouillé avec la nouvelle passphrase

**Test critique** : Verrouillez à nouveau, déverrouillez avec la **nouvelle** passphrase → doit fonctionner

---

## 📦 Tests d'Import/Export

### Test 7 : Export Vault (.vault)

1. **Ajoutez** 2-3 entrées de test
2. **Menu Fichier** → Export Coffre (Ctrl+E)
3. **Sauvegardez** le fichier (ex: `mon-coffre-2026-02-03.vault`)
4. ✅ **Succès** : Fichier créé avec dialogue natif

**Vérification** :

```powershell
# Dans PowerShell
Get-Content "mon-coffre-2026-02-03.vault" | ConvertFrom-Json
# Doit contenir : version, exportDate, vault.salt, vault.entries
```

---

### Test 8 : Import Vault

1. **Réinitialisez** le coffre (bouton 🔧 en bas de VaultInit)
2. **Sur la page init** : Cliquez "📥 Importer un coffre existant"
3. **Sélectionnez** le fichier `.vault` exporté
4. **Entrez** la passphrase d'origine
5. ✅ **Succès** : Toutes vos entrées sont restaurées

---

### Test 9 : Export Sélection

1. **Créez** 3 entrées
2. **Cochez** 2 entrées
3. **Cliquez** "Export sélection"
4. ✅ **Succès** : Fichier JSON avec seulement 2 entrées

---

### Test 10 : Export CSV

1. **Cliquez** "Export CSV"
2. **Sauvegardez** le fichier
3. **Ouvrez** dans Excel/LibreOffice
4. ✅ **Succès** : Colonnes : type, name, username, password, url, notes

**⚠️ ATTENTION** : CSV est en clair, supprimer après test !

---

## 🔧 Tests Avancés (OPTIONNELS)

### Test 11 : Réinitialisation Complète

1. **Ouvrez** Settings → Réinitialisation
2. **Tapez** exactement : `SUPPRIMER TOUT`
3. **Confirmez**
4. ✅ **Succès** : localStorage vide, retour à l'init

**Vérification** :

```javascript
Object.keys(localStorage).length // Doit être 0
```

---

### Test 12 : Auto-Lock

1. **Settings** → Auto-lock
2. **Activez** avec délai : 1 minute
3. **Attendez** 1 minute sans activité
4. ✅ **Succès** : Coffre verrouillé automatiquement

---

### Test 13 : TOTP (2FA)

1. **Settings** → TOTP
2. **Scannez** le QR Code avec Google Authenticator
3. **Entrez** le code à 6 chiffres
4. **Verrouillez** puis déverrouillez
5. ✅ **Succès** : Demande passphrase + code TOTP

---

## 🐛 Diagnostic des Erreurs

### Erreur : "Passphrase incorrecte"

```javascript
// DevTools Console
const salt = localStorage.getItem('vault_salt');
console.log('Salt length:', salt.length);
console.log('Salt preview:', salt.substring(0, 20));
// Doit être base64 (ex: "a7K9mP2qL..."  ), pas hex
```

**Fix** : Réinitialisez localStorage, recréez le coffre

---

### Erreur : "Unexpected token '<'"

```javascript
// Si cette erreur apparaît, cherchez :
grep -r "fetch('/api/" renderer/
// NE DOIT RIEN RETOURNER
```

**Fix** : Vérifiez [MIGRATION-API-TO-LOCALSTORAGE.md](MIGRATION-API-TO-LOCALSTORAGE.md)

---

### Erreur : "Cannot read property 'length' of null"

```javascript
// Vérifiez que vault_data existe :
const data = localStorage.getItem('vault_data');
console.log('Vault data:', data);
// Si null → localStorage.setItem('vault_data', '[]')
```

---

## 📊 Checklist Complète

### Fonctions Core ✅

- [ ] Créer coffre
- [ ] Déverrouiller
- [ ] Verrouiller
- [ ] Ajouter entrée
- [ ] Modifier entrée
- [ ] Supprimer entrée
- [ ] Rechercher entrées

### Sécurité ✅

- [ ] Générer codes récupération
- [ ] Utiliser code récupération
- [ ] Auto-lock
- [ ] TOTP (optionnel)
- [ ] WebAuthn (optionnel)

### Import/Export ✅

- [ ] Export .vault (natif Electron)
- [ ] Import .vault
- [ ] Export JSON
- [ ] Export CSV
- [ ] Export sélection

### Gestion ✅

- [ ] Créer dossier
- [ ] Déplacer entrée vers dossier
- [ ] Tagger entrées
- [ ] Dupliquer entrée
- [ ] Nettoyer doublons

### Avancé ✅

- [ ] Générateur de mot de passe
- [ ] Historique de modification
- [ ] Audit log
- [ ] Réinitialisation complète

---

## 🎯 Critères de Succès

✅ **Application validée si** :

1. Tous les tests Core passent (10/10)
2. Au moins 1 test de sécurité passe
3. Export/Import .vault fonctionne
4. Aucune erreur "fetch" ou "JSON parse" dans la console

---

## 📝 Rapport de Bug

**Si un test échoue**, créez un rapport avec :

```markdown
### ❌ Test Échoué : [Nom du test]

**Étapes** :
1. ...
2. ...

**Résultat attendu** : ...

**Résultat obtenu** : ...

**Console DevTools** :

```txt
[Coller les erreurs]
```

**localStorage state** :

```javascript
console.log('Salt:', localStorage.getItem('vault_salt')?.substring(0, 20));
console.log('Data:', JSON.parse(localStorage.getItem('vault_data') || '[]').length);
```

**Version** : Electron 1.0.0 (dev)

---

## 🚀 Prochaines Étapes

Après validation complète :

1. **Production Build** : `npm run build:win`
2. **Test installateur** : Installer depuis `dist/Cryptos Coffre Setup.exe`
3. **Test mise à jour** : Tester auto-update (nécessite GitHub Release)

---

**Créé le** : 3 février 2026  
**Auteur** : Cryptos Services (Hyper-Cryptos)  
**Status** : 🎉 Prêt pour tests
