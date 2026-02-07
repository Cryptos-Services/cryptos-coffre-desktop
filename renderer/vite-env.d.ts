/// <reference types="vite/client" />

/**
 * Déclarations de types pour Electron
 * (Les types d'assets comme *.png sont déjà fournis par vite/client)
 */

declare global {
  interface Window {
    electronAPI: {
      vault: {
        lock: () => void;
        export: () => void;
        import: () => void;
        onLock: (callback: () => void) => void;
        onExport: (callback: () => void) => void;
        onImport: (callback: () => void) => void;
        onAbout: (callback: (message: string) => void) => void;
        onUpdateAvailable: (callback: (info: any) => void) => void;
        onUpdateDownloaded: (callback: (info: any) => void) => void;
        onUpdateError: (callback: (error: string) => void) => void;
        installUpdate: () => void;
      };
      crypto: {
        encrypt: (data: string, key: string) => Promise<string>;
        decrypt: (encrypted: string, key: string) => Promise<string>;
        hash: (data: string) => Promise<string>;
        randomBytes: (length: number) => Promise<Uint8Array>;
      };
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => boolean;
      };
      platform: NodeJS.Platform;
      version: string;
    };
  }
}

export {};
