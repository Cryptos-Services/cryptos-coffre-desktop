# Cryptos Coffre Desktop - AI Coding Instructions

## Project Overview

Electron desktop app for secure password/document management. Zero-knowledge architecture with AES-GCM 256-bit encryption, React UI, and IPC-based native integrations.

## Architecture

**Three-Process Model:**
- **Main** ([main/main.ts](../main/main.ts)): Window management, menu, auto-updates, IPC handlers
- **Preload** ([main/preload.ts](../main/preload.ts)): Secure IPC bridge via `contextBridge`
- **Renderer** ([renderer/](../renderer/)): React app loaded from `dist-web/` (production) or localhost:5173 (dev)

**Critical:** Renderer uses Web Crypto API for encryption ([renderer/lib/encryption.ts](../renderer/lib/encryption.ts)). Main provides optional Node.js crypto fallback via IPC.

**Storage:** All vault data stored in **localStorage** (NO backend API). Keys:
- `vault_salt`: Base64-encoded salt for key derivation
- `vault_data`: JSON array of encrypted VaultEntry objects
- `security_settings`: Auto-lock, TOTP, WebAuthn config

## Key Workflows

### Development
```powershell
npm run dev  # Starts Electron + Vite dev server (localhost:5173)
```

### Build Process
```powershell
npm run build:win   # Compiles TypeScript → dist/, builds NSIS installer
npm run copy-web    # Copies build from E:\Cryptos-Services\out\ → dist-web/
```

**Important:** `dist-web/` must exist before production builds. App loads from this folder when packaged.

### IPC Communication Pattern
```typescript
// Renderer → Main (bidirectional)
window.electronAPI.vault.export()         // Invokes main/ipc/vault.ts
window.electronAPI.crypto.encrypt(...)    // Invokes main/ipc/crypto.ts

// Main → Renderer (events)
mainWindow.webContents.send('vault:lock') // Triggers via preload listeners
```

## Security Architecture

### Encryption Flow
1. **Initialization** ([VaultInit.tsx](../renderer/components/VaultInit.tsx)):
   - Generate salt → Store as `vault_salt` in localStorage (base64)
   - Derive key via PBKDF2 (100k iterations) → Never persists
   - Encrypt data → Store as `vault_data`

2. **Unlock** ([useVault.ts](../renderer/hooks/useVault.ts)):
   - Retrieve `vault_salt` → Derive key from passphrase
   - Decrypt `vault_data` → Validate by attempting decryption

**localStorage Keys:**
- `vault_salt`: Base64-encoded 16-byte salt (MUST be hex-compatible)
- `vault_data`: Encrypted JSON of vault entries
- `security_settings`: Auto-lock, TOTP, WebAuthn config

### Zero-Knowledge Principle
- Passphrase NEVER stored (session only)
- All encryption/decryption happens client-side (Web Crypto API)
- Export/Import via IPC dialogs ([main/ipc/vault.ts](../main/ipc/vault.ts)) preserves encryption

## Common Patterns

### Adding IPC Handlers
1. Create handler in `main/ipc/` (e.g., `vault.ts`)
2. Register in [main/main.ts](../main/main.ts): `registerVaultHandlers()`
3. Expose in [preload.ts](../main/preload.ts) via `contextBridge.exposeInMainWorld`
4. Add TypeScript types to `ElectronAPI` interface

### Creating React Components
- Use hooks: `useVault()` for vault ops, `useSecuritySettings()` for config
- Follow naming: `VaultDashboard.tsx` + `VaultDashboard.css` in `renderer/styles/`
- Access Electron APIs via `window.electronAPI` (typed in preload.ts)

### Handling Encryption
```typescript
// ALWAYS use existing functions from renderer/lib/encryption.ts
import { deriveKey, encrypt, decrypt, generateSalt, saltToBase64, base64ToSalt } from '../lib/encryption';

// CRITICAL: Salt MUST be stored as base64 (NOT hex)
const salt = generateSalt(); // Returns Uint8Array
localStorage.setItem('vault_salt', saltToBase64(salt)); // Use saltToBase64()

// When reading:
const saltBase64 = localStorage.getItem('vault_salt');
const salt = base64ToSalt(saltBase64); // Use base64ToSalt()
```

**⚠️ Common Salt Format Error:**
- NEVER convert salt to hex manually: `salt.map(b => b.toString(16))` ❌
- ALWAYS use `saltToBase64()` for storage and `base64ToSalt()` for retrieval ✅
- Mismatch causes "Passphrase incorrecte" errors even with correct passphrase

## Common Issues

### "Passphrase Incorrect" After Init
- **Cause:** Salt format mismatch (hex vs base64)
- **Fix:** Check `vault_salt` in DevTools → Must be base64, retrieve with `base64ToSalt()`
- **Diagnostic:** Use [DiagnosticModal](../renderer/components/DiagnosticModal.tsx) (floating 🔍 button in dev)

### "Build Web Introuvable"
- **Cause:** Missing `dist-web/` folder
- **Fix:** Run `npm run copy-web` OR manually copy from `E:\Cryptos-Services\out\`

### IPC Not Working
1. Verify handler registered in [main/main.ts](../main/main.ts)
2. Check preload exposes function in `electronAPI` object
3. Confirm `contextIsolation: true` in webPreferences
4. Use `ipcRenderer.invoke()` for async, `ipcRenderer.send()` for fire-and-forget

### API Fetch Errors
- **Cause:** Code trying to `fetch('/api/vault/...')` but Electron has NO backend
- **Fix:** Use localStorage directly (see [useVault.ts](../renderer/hooks/useVault.ts) for patterns)
- **Pattern:** Read `localStorage.getItem('vault_data')`, modify array, write back with `setItem()`
- **Common files to check:** VaultDashboard.tsx, useVault.ts, useSecuritySettings.ts, PasswordRecovery.tsx, VaultExport.tsx

## File Organization

```
main/
├── main.ts              # Electron entry, window creation, menu
├── preload.ts           # IPC bridge (ONLY file with contextBridge)
└── ipc/                 # IPC handlers (vault, crypto)

renderer/
├── components/          # React components (one per feature)
├── hooks/               # useVault, useSecuritySettings
├── lib/                 # encryption, auditLog, totp, webauthn
├── types/               # vault.ts (VaultEntry, DecryptedEntry, etc.)
└── styles/              # Component-specific CSS

resources/
├── icons/               # App icons (ico, png, icns)
└── installer/           # NSIS header.bmp, DMG background.png
```

## Build Configuration

- **electron-builder.yml**: Installer config (NSIS options, DMG settings)
- **electron.vite.config.ts**: Separate builds for main/preload/renderer
- **package.json**: Scripts use `electron-vite` (NOT vanilla Vite)

## Testing Approach

**Manual Testing Workflow:**
1. `npm run dev` → Test in Electron
2. Open DevTools (F12) → Check localStorage, console errors
3. Use DiagnosticModal for vault state inspection
4. Test export/import with `.vault` files

**No automated tests yet.** Focus on manual verification of crypto flows.

## External Dependencies

- **Cryptos-Services** (E:\Cryptos-Services): Separate web app, builds to `out/`
- **electron-updater**: Auto-update from GitHub Releases (production only)
- **Web Crypto API**: Browser-native encryption (no external crypto libs in renderer)

## Migration Notes

- Electron localStorage is isolated from browser (different AppData paths)
- Import/Export (.vault files) bridges web ↔ desktop environments
- See [MIGRATION-GUIDE.md](../MIGRATION-GUIDE.md) for user-facing migration steps

## When Modifying Code

1. **Security Changes**: Always test unlock flow after modifying encryption.ts
2. **IPC Changes**: Test both dev (localhost:5173) and production (dist-web) modes
3. **UI Changes**: Verify in both unlocked and locked states
4. **Build Changes**: Test `npm run build:win` before commits affecting electron-builder config
