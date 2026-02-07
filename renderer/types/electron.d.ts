/**
 * Déclarations TypeScript pour l'API Electron exposée via contextBridge
 * Ce fichier doit correspondre aux interfaces définies dans preload.ts
 */

interface VaultAPI {
  lock: () => void;
  export: () => void;
  import: () => void;
  manageDuplicates: () => void;
  exportSelective: () => void;
  
  onLock: (callback: () => void) => void;
  onExport: (callback: () => void) => void;
  onImport: (callback: () => void) => void;
  onManageDuplicates: (callback: () => void) => void;
  onExportSelective: (callback: () => void) => void;
  onAbout: (callback: (message: string) => void) => void;
  
  // Cleanup des listeners
  removeLockListener: (callback: () => void) => void;
  removeExportListener: (callback: () => void) => void;
  removeImportListener: (callback: () => void) => void;
  removeManageDuplicatesListener: (callback: () => void) => void;
  removeExportSelectiveListener: (callback: () => void) => void;
  removeAboutListener: (callback: (message: string) => void) => void;
  
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
  onUpdateError: (callback: (error: string) => void) => void;
  installUpdate: () => void;
}

interface CryptoAPI {
  encrypt: (data: string, key: string) => Promise<string>;
  decrypt: (encrypted: string, key: string) => Promise<string>;
  hash: (data: string) => Promise<string>;
  randomBytes: (length: number) => Promise<Uint8Array>;
}

interface WindowAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => boolean;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => void;
}

interface ElectronAPI {
  vault: VaultAPI;
  crypto: CryptoAPI;
  window: WindowAPI;
  platform: NodeJS.Platform;
  version: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
