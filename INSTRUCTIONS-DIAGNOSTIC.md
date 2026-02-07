# 🔧 Instructions de Diagnostic - Application Electron

## Contexte

L'application Electron ne reconnaît pas la passphrase après l'initialisation.
Nous devons vérifier le localStorage pour diagnostiquer le problème.

---

## ✅ Fichiers déjà créés (ne pas recréer)

1. ✅ `renderer/components/VaultInit.tsx` - Écran d'initialisation
2. ✅ `renderer/components/DiagnosticModal.tsx` - Modal de diagnostic
3. ✅ `renderer/App.tsx` - Modifié pour inclure le diagnostic

---

## 🔍 Étape 1 : Vérifier que l'application compile

Depuis le terminal PowerShell dans **E:\Cryptos-Coffre-Desktop** :

```powershell
cd "E:\Cryptos-Coffre-Desktop"
npm run dev
```

**Attendez que l'application démarre sans erreurs.**

---

## 🔍 Étape 2 : Ouvrir l'application et accéder au diagnostic

1. L'application Electron devrait s'ouvrir automatiquement
2. Vous devriez voir l'écran de **déverrouillage** (si un coffre existe)
3. Cherchez le **bouton bleu flottant 🔍** en bas à droite de l'écran
4. Cliquez dessus pour ouvrir le diagnostic

---

## 🔍 Étape 3 : Relever les informations du diagnostic

Dans la fenêtre de diagnostic, notez :

- **Salt stocké :** OUI/NON
- **Longueur salt :** (nombre de caractères)
- **Aperçu salt :** (premiers 20 caractères)
- **Données stockées :** OUI/NON
- **Aperçu données :** (contenu)
- **Toutes les clés localStorage :** (liste)

---

## 🔍 Étape 4 : Tester manuellement dans la Console DevTools

Ouvrez la console DevTools (F12) et exécutez :

```javascript
// Vérifier le salt
console.log('vault_salt:', localStorage.getItem('vault_salt'));

// Vérifier les données
console.log('vault_data:', localStorage.getItem('vault_data'));

// Vérifier toutes les clés
console.log('Toutes les clés:', Object.keys(localStorage));
```

**Copiez-moi les résultats.**

---

## 🔧 Étape 5 : Si le salt est au mauvais format

Si le salt existe mais n'est pas reconnu, c'est probablement un problème de format.

**Vérification :**

- Le salt doit être en **hexadécimal** (32 caractères)
- Format attendu : `a1b2c3d4e5f6...` (uniquement 0-9 et a-f)

**Si le format est incorrect, réinitialiser :**

Dans la console DevTools :

```javascript
localStorage.clear();
location.reload();
```

Puis recréer le coffre avec une nouvelle passphrase.

---

## 📋 Informations à me communiquer

Envoyez-moi ces informations :

1. ✅ L'application démarre-t-elle sans erreurs ?
2. ✅ Le bouton 🔍 est-il visible ?
3. ✅ Contenu du diagnostic (capture d'écran ou texte)
4. ✅ Résultat des commandes console (étape 4)

---

## 🚨 En cas de problème

Si l'application ne compile pas ou crash :

```powershell
# Vérifier les erreurs TypeScript
cd "E:\Cryptos-Coffre-Desktop"
Get-ChildItem -Recurse -Filter "*.tsx" | Select-String -Pattern "error TS"

# Vérifier que les fichiers existent
Test-Path "renderer\components\VaultInit.tsx"
Test-Path "renderer\components\DiagnosticModal.tsx"
Test-Path "renderer\App.tsx"
```

---

## 📝 Notes importantes

- **NE PAS travailler dans E:\Cryptos-Services**
- **Toujours être dans E:\Cryptos-Coffre-Desktop**
- L'application Electron tourne sur **localhost:5173** (Vite)
- Le localStorage est stocké dans : `C:\Users\Hyper Cryptos\AppData\Roaming\Cryptos Coffre\`

---

## ✅ Checklist finale

- [ ] Application démarre sans erreurs
- [ ] Bouton 🔍 visible
- [ ] Modal de diagnostic s'ouvre
- [ ] Informations relevées et envoyées
- [ ] Console DevTools testée
- [ ] Résultats communiqués

---

**Une fois ces étapes complétées, je pourrai diagnostiquer précisément le problème et vous donner la solution.**
