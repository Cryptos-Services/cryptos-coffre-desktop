import { app, BrowserWindow, ipcMain, Menu, shell, screen } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';

// Import IPC handlers
import { registerVaultHandlers } from './ipc/vault';
import { registerCryptoHandlers } from './ipc/crypto';

let mainWindow: BrowserWindow | null = null;

// Configuration auto-update
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

/**
 * Création de la fenêtre principale
 */
function createMainWindow() {
  // Fenêtre adaptative : 85% de l'écran disponible
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: Math.min(1400, Math.floor(screenWidth * 0.6)),
    height: Math.min(900, Math.floor(screenHeight * 0.75)),
    minWidth: 375,
    minHeight: 667,
    frame: false,
    titleBarStyle: 'hidden',
    resizable: true,  // IMPORTANT : Permet le resize et maximize
    maximizable: true, // Permet explicitement le maximize
    fullscreenable: true, // Permet explicitement le fullscreen
    title: 'Cryptos Services - Coffre-Fort Numérique Sécurisé',
    icon: path.join(__dirname, '../../resources/icons/Cryptos-Coffre-Logo.png'),
    backgroundColor: '#030121',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, '../preload/preload.js'), // ✅ Chemin corrigé
      devTools: !app.isPackaged, // DevTools seulement en dev
    },
    show: false, // Afficher seulement quand prêt
  });

  // Charge l'application web
  if (app.isPackaged) {
    // Production : charge le build du renderer
    const indexPath = path.join(__dirname, '../renderer/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      console.error('❌ Build renderer introuvable dans dist/renderer/');
      app.quit();
    }
  } else {
    // Développement : charge le serveur Vite
    mainWindow.loadURL('http://localhost:5173');
  }

  // Affiche la fenêtre quand prête
  mainWindow.once('ready-to-show', () => {
    // Force le reset du zoom Electron natif
    mainWindow?.webContents.setZoomFactor(1.0);
    mainWindow?.show();
    mainWindow?.focus();
    
    // Force l'enregistrement des raccourcis clavier après l'affichage
    mainWindow?.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.focus();
    });
  });

  // Synchronise l'état maximize/unmaximize avec le renderer
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized', true);
  });
  
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized', false);
  });

  // Ouvre les liens externes dans le navigateur
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') || url.startsWith('https')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Nettoyage à la fermeture
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Vérification des mises à jour (production uniquement)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);
  }
}

/**
 * Menu de l'application
 */
function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Verrouiller',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow?.webContents.send('vault:lock');
          },
        },
        { type: 'separator' },
        {
          label: 'Gérer les Doublons',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            mainWindow?.webContents.send('vault:manage-duplicates');
          },
        },
        {
          label: 'Export Sélectif',
          accelerator: 'CmdOrCtrl+Alt+E',
          click: () => {
            mainWindow?.webContents.send('vault:export-selective');
          },
        },
        {
          label: 'Exporter Tout',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('vault:export');
          },
        },
        {
          label: 'Importer',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow?.webContents.send('vault:import');
          },
        },
        { type: 'separator' },
        {
          label: 'Quitter',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { label: 'Annuler', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Rétablir', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Couper', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copier', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Coller', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Tout sélectionner', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Recharger', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Forcer le rechargement', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Plein écran', accelerator: 'F11', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://cryptos-services.com/docs/coffre');
          },
        },
        {
          label: 'Signaler un bug',
          click: () => {
            shell.openExternal('https://github.com/cryptos-services/cryptos-coffre-desktop/issues');
          },
        },
        { type: 'separator' },
        {
          label: 'À propos',
          click: () => {
            const about = `Cryptos Coffre Desktop
Version ${app.getVersion()}

Coffre-Fort Numérique Sécurisé
© ${new Date().getFullYear()} Cryptos Services

Chiffrement AES-GCM 256-bit
Architecture Zero-Knowledge`;
            
            mainWindow?.webContents.send('show:about', about);
          },
        },
      ],
    },
  ];

  // Ajoute DevTools en développement
  if (!app.isPackaged) {
    template.push({
      label: 'Développement',
      submenu: [
        { label: 'Ouvrir DevTools', accelerator: 'F12', role: 'toggleDevTools' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Gestion des mises à jour
 */
autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update:available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update:downloaded', info);
});

autoUpdater.on('error', (err) => {
  console.error('❌ Erreur auto-update:', err);
  mainWindow?.webContents.send('update:error', err.message);
});

/**
 * Lifecycle Electron
 */
app.whenReady().then(() => {
  // Crée le menu AVANT la fenêtre (important pour les raccourcis)
  createApplicationMenu();
  
  // Enregistre les handlers IPC
  registerVaultHandlers();
  registerCryptoHandlers();
  
  // Handlers pour les actions du CustomTitleBar (canal séparé pour éviter doublons)
  ipcMain.on('titlebar:lock', () => {
    mainWindow?.webContents.send('vault:lock');
  });
  
  // Export et Import sont gérés directement dans CustomTitleBar (pas d'IPC)
  // ipcMain.on('titlebar:export', () => { ... });
  // ipcMain.on('titlebar:import', () => { ... });
  
  ipcMain.on('titlebar:manage-duplicates', () => {
    mainWindow?.webContents.send('vault:manage-duplicates');
  });
  
  ipcMain.on('titlebar:export-selective', () => {
    mainWindow?.webContents.send('vault:export-selective');
  });
  
  // Handlers pour les contrôles de fenêtre
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });
  
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  
  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });
  
  ipcMain.on('window:isMaximized', (event) => {
    event.returnValue = mainWindow?.isMaximized() ?? false;
  });
  
  // Handler shell external URL
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    await shell.openExternal(url);
  });
  
  // Handler install update
  ipcMain.on('update:install', () => {
    autoUpdater.quitAndInstall();
  });

  createMainWindow();

  // macOS : recrée la fenêtre si activée sans fenêtre ouverte
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Quitte quand toutes les fenêtres sont fermées (sauf macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Empêche plusieurs instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}




