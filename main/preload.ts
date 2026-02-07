import { contextBridge, ipcRenderer } from 'electron';

/**
 * Bridge IPC sécurisé entre Electron et le renderer
 * Expose uniquement les APIs nécessaires au vault
 */

// Types pour TypeScript
export interface VaultAPI {
  // Gestion du vault
  lock: () => void;
  export: () => void;
  import: () => void;
  manageDuplicates: () => void;
  exportSelective: () => void;
  
  // Listeners
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
  
  // Updates
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
  onUpdateError: (callback: (error: string) => void) => void;
  installUpdate: () => void;
}

export interface CryptoAPI {
  // Chiffrement natif (optionnel, peut utiliser Web Crypto API)
  encrypt: (data: string, key: string) => Promise<string>;
  decrypt: (encrypted: string, key: string) => Promise<string>;
  hash: (data: string) => Promise<string>;
  randomBytes: (length: number) => Promise<Uint8Array>;
}

export interface WindowAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => boolean;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => void;
}

export interface ElectronAPI {
  vault: VaultAPI;
  crypto: CryptoAPI;
  window: WindowAPI;
  platform: NodeJS.Platform;
  version: string;
}

// API Vault
const vaultAPI: VaultAPI = {
  // Les appels depuis CustomTitleBar utilisent mainWindow.webContents.send indirectement
  lock: () => ipcRenderer.send('titlebar:lock'),
  export: () => ipcRenderer.send('titlebar:export'),
  import: () => ipcRenderer.send('titlebar:import'),
  manageDuplicates: () => ipcRenderer.send('titlebar:manage-duplicates'),
  exportSelective: () => ipcRenderer.send('titlebar:export-selective'),
  
  // Les listeners écoutent les événements du menu natif ET du titlebar (après redirection)
  // IMPORTANT: On utilise removeAllListeners avant d'ajouter pour éviter les doublons
  onLock: (callback) => {
    ipcRenderer.removeAllListeners('vault:lock');
    ipcRenderer.on('vault:lock', () => callback());
  },
  onExport: (callback) => {
    ipcRenderer.removeAllListeners('vault:export');
    ipcRenderer.on('vault:export', () => callback());
  },
  onImport: (callback) => {
    ipcRenderer.removeAllListeners('vault:import');
    ipcRenderer.on('vault:import', () => callback());
  },
  onManageDuplicates: (callback) => {
    ipcRenderer.removeAllListeners('vault:manage-duplicates');
    ipcRenderer.on('vault:manage-duplicates', () => callback());
  },
  onExportSelective: (callback) => {
    ipcRenderer.removeAllListeners('vault:export-selective');
    ipcRenderer.on('vault:export-selective', () => callback());
  },
  onAbout: (callback) => {
    ipcRenderer.removeAllListeners('show:about');
    ipcRenderer.on('show:about', (_event, message) => callback(message));
  },
  
  // Cleanup des listeners (évite les doubles appels)
  removeLockListener: (callback) => ipcRenderer.removeListener('vault:lock', callback as any),
  removeExportListener: (callback) => ipcRenderer.removeListener('vault:export', callback as any),
  removeImportListener: (callback) => ipcRenderer.removeListener('vault:import', callback as any),
  removeManageDuplicatesListener: (callback) => ipcRenderer.removeListener('vault:manage-duplicates', callback as any),
  removeExportSelectiveListener: (callback) => ipcRenderer.removeListener('vault:export-selective', callback as any),
  removeAboutListener: (callback) => ipcRenderer.removeListener('show:about', callback as any),
  
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (_event, info) => callback(info)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', (_event, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update:error', (_event, error) => callback(error)),
  installUpdate: () => ipcRenderer.send('update:install'),
};

// API Crypto (optionnelle, Web Crypto API peut suffire)
const cryptoAPI: CryptoAPI = {
  encrypt: (data, key) => ipcRenderer.invoke('crypto:encrypt', data, key),
  decrypt: (encrypted, key) => ipcRenderer.invoke('crypto:decrypt', encrypted, key),
  hash: (data) => ipcRenderer.invoke('crypto:hash', data),
  randomBytes: (length) => ipcRenderer.invoke('crypto:randomBytes', length),
};

// API Window (contrôles fenêtre custom)
const windowAPI: WindowAPI = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.sendSync('window:isMaximized'),
  onMaximizedChange: (callback) => ipcRenderer.on('window:maximized', (_event, isMaximized) => callback(isMaximized)),
};

// Expose l'API au contexte window
contextBridge.exposeInMainWorld('electronAPI', {
  vault: vaultAPI,
  crypto: cryptoAPI,
  window: windowAPI,
  platform: process.platform,
  version: process.versions.electron,
} as ElectronAPI);

// Pour le développement : log des événements IPC
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  console.log('🔐 Preload script chargé');
  console.log('📦 Electron API exposée:', Object.keys(vaultAPI));
}
