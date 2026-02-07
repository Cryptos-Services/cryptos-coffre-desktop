import { ipcMain, dialog } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Handlers IPC pour la gestion du Vault
 * Gère l'export/import, le stockage local, etc.
 */

export function registerVaultHandlers() {
  // Export du vault vers fichier .vault
  ipcMain.handle('vault:export-to-file', async (_event, vaultData: string) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Exporter le Vault',
        defaultPath: `vault-backup-${new Date().toISOString().split('T')[0]}.vault`,
        filters: [
          { name: 'Vault Files', extensions: ['vault'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, error: 'Export annulé' };
      }

      await fs.writeFile(filePath, vaultData, 'utf-8');

      return { success: true, path: filePath };
    } catch (error) {
      console.error('❌ Erreur export vault:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Import du vault depuis fichier .vault
  ipcMain.handle('vault:import-from-file', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Importer un Vault',
        filters: [
          { name: 'Vault Files', extensions: ['vault'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, error: 'Import annulé' };
      }

      const filePath = filePaths[0];
      const fileContent = await fs.readFile(filePath, 'utf-8');

      return { success: true, data: fileContent, path: filePath };
    } catch (error) {
      console.error('❌ Erreur import vault:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Export du vault vers CSV
  ipcMain.handle('vault:export-to-csv', async (_event, csvData: string) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Exporter en CSV',
        defaultPath: `vault-export-${new Date().toISOString().split('T')[0]}.csv`,
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, error: 'Export annulé' };
      }

      await fs.writeFile(filePath, csvData, 'utf-8');

      return { success: true, path: filePath };
    } catch (error) {
      console.error('❌ Erreur export CSV:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Import CSV
  ipcMain.handle('vault:import-from-csv', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Importer depuis CSV',
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, error: 'Import annulé' };
      }

      const filePath = filePaths[0];
      const fileContent = await fs.readFile(filePath, 'utf-8');

      return { success: true, data: fileContent, path: filePath };
    } catch (error) {
      console.error('❌ Erreur import CSV:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  console.log('✅ Vault handlers enregistrés');
}
