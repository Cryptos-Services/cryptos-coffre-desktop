import React, { useState, useEffect } from 'react';
import '../styles/CustomTitleBar.css';
import iconPath from '../assets/Cryptos-Coffre-Logo.png';
import { addAuditLog } from '../lib/auditLog';
import { detectImportFormat, parseKasperskyTXT, parseKasperskyCSV, parseGenericCSV } from '../lib/importParsers';
import { useToast } from '../hooks/useToast';
import type { CreateEntryParams } from '../types/vault';

interface CustomTitleBarProps {
  onShowLicense?: () => void;
}

export default function CustomTitleBar({ onShowLicense }: CustomTitleBarProps = {}) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Vérifie l'état initial de la fenêtre
    if (window.electronAPI) {
      setIsMaximized(window.electronAPI.window.isMaximized());
      
      // Écoute les changements d'état de la fenêtre
      window.electronAPI.window.onMaximizedChange((isMaximized: boolean) => {
        setIsMaximized(isMaximized);
      });
    }
    
    // Réinitialise le zoom au chargement
    document.body.style.zoom = '1';
    
    // Écoute l'état de verrouillage du coffre
    const handleUnlockStateChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ unlocked: boolean }>;
      setIsVaultUnlocked(customEvent.detail.unlocked);
    };
    
    window.addEventListener('vault-unlock-state', handleUnlockStateChange);
    
    return () => {
      window.removeEventListener('vault-unlock-state', handleUnlockStateChange);
    };
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.window.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.window.maximize();
      // L'état sera automatiquement synchronisé via l'événement 'window:maximized'
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.window.close();
    }
  };

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const closeMenus = () => {
    setActiveMenu(null);
  };

  /**
   * Exporte le coffre chiffé en JSON
   */
  const handleExport = async () => {
    try {
      // Récupère les données chiffrées depuis localStorage
      const encryptedData = localStorage.getItem('vault_data');
      const salt = localStorage.getItem('vault_salt');
      
      if (!encryptedData || !salt) {
        toast.error('Aucune donnée', 'Aucune donnée à exporter');
        return;
      }

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        salt: salt,
        entries: JSON.parse(encryptedData),
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-backup-${new Date().toISOString().split('T')[0]}.vault`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log d'audit
      addAuditLog('export_data', {
        success: true,
      });

      // console.log('✅ Export réussi');
    } catch (err) {
      console.error('❌ Erreur export:', err);
      addAuditLog('export_data', {
        success: false,
        errorMessage: String(err),
      });
      toast.error('Erreur d\'export', `Erreur lors de l'export: ${err}`);
    }
  };

  /**
   * Importe un coffre depuis un fichier (multi-formats : .vault, .json, .csv, .txt)
   */
  const handleImport = () => {
    // Crée un input file dynamique
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.vault,.json,.csv,.txt';
    
    fileInput.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const format = detectImportFormat(file.name, text);
        
        if (format === 'vault-json') {
          // Import natif du coffre (fonctionne même verrouillé)
          await handleVaultImport(text);
        } else if (format === 'kaspersky-txt') {
          // Import depuis Kaspersky TXT (nécessite coffre déverrouillé)
          await handleExternalImport(text, 'kaspersky-txt', parseKasperskyTXT(text));
        } else if (format === 'kaspersky-csv') {
          // Import depuis Kaspersky CSV (nécessite coffre déverrouillé)
          await handleExternalImport(text, 'kaspersky-csv', parseKasperskyCSV(text));
        } else if (format === 'generic-csv') {
          // Import depuis CSV générique (nécessite coffre déverrouillé)
          await handleExternalImport(text, 'generic-csv', parseGenericCSV(text));
        } else {
          toast.error(
            'Format non reconnu',
            'Formats supportés : .vault/.json (coffre natif), .txt/.csv (Kaspersky), .csv (générique)',
            6000
          );
        }
      } catch (err) {
        console.error('❌ Erreur import:', err);
        addAuditLog('import_data', {
          success: false,
          errorMessage: String(err),
        });
        toast.error('Erreur d\'import', `Erreur lors de l'import: ${err}`);
      }
    };
    
    fileInput.click();
  };

  /**
   * Import du format natif .vault (remplace tout le coffre)
   */
  const handleVaultImport = async (text: string) => {
    const importData = JSON.parse(text);
    
    // Valide la structure
    if (!importData.version || !importData.salt || !importData.entries) {
      toast.error('Format invalide', 'Le fichier .vault est corrompu ou invalide');
      return;
    }
    
    const confirmed = window.confirm(
      `⚠️ Importer ce coffre remplacera toutes les données actuelles.\n` +
      `Date d'export: ${new Date(importData.exportDate).toLocaleDateString('fr-FR')}\n` +
      `Nombre d'entrées: ${importData.entries.length}\n\n` +
      `Voulez-vous continuer ?`
    );
    
    if (!confirmed) return;
    
    // Stocke le nouveau salt
    localStorage.setItem('vault_salt', importData.salt);
    
    // Stocke les entrées directement dans localStorage
    localStorage.setItem('vault_data', JSON.stringify(importData.entries));
    
    // Log d'audit
    addAuditLog('import_data', {
      success: true,
    });
    
    toast.success(
      'Coffre importé !',
      'Veuillez déverrouiller avec la passphrase d\'origine',
      4000
    );
    
    // Recharge la page après un court délai pour que l'utilisateur voie le toast
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  /**
   * Import depuis formats externes (Kaspersky, CSV générique)
   * Ces imports AJOUTENT des entrées au coffre existant
   */
  const handleExternalImport = async (text: string, format: string, parsedEntries: CreateEntryParams[]) => {
    if (parsedEntries.length === 0) {
      toast.warning('Aucune entrée', `Aucune entrée valide trouvée dans le fichier ${format}`);
      return;
    }
    
    // Vérifie si le coffre existe et contient des données
    const vaultData = localStorage.getItem('vault_data');
    if (!vaultData) {
      toast.error('Coffre manquant', 'Veuillez d\'abord créer un coffre');
      return;
    }
    
    const formatName = format === 'kaspersky-txt' ? 'Kaspersky (TXT)' 
      : format === 'kaspersky-csv' ? 'Kaspersky (CSV)' 
      : 'CSV générique';
    
    const confirmed = window.confirm(
      `📥 Import depuis ${formatName}\n\n` +
      `${parsedEntries.length} entrée(s) trouvée(s)\n\n` +
      `⚠️ Ces entrées seront AJOUTÉES à votre coffre actuel.\n` +
      `Assurez-vous que le coffre est DÉVERROUILLÉ dans le dashboard.\n\n` +
      `Voulez-vous continuer ?`
    );
    
    if (!confirmed) return;
    
    // Stocke temporairement pour import dans VaultDashboard
    sessionStorage.setItem('pending_import', JSON.stringify({
      format,
      entries: parsedEntries,
      timestamp: Date.now()
    }));
    
    addAuditLog('import_pending', {
      format,
      count: parsedEntries.length,
      success: true,
    });
    
    // Message plus clair
    toast.success(
      `${parsedEntries.length} entrée(s) prête(s)`,
      'Si le coffre est déverrouillé, les entrées seront ajoutées automatiquement',
      5000
    );
    
    // Notifie VaultDashboard qu'il y a un import en attente
    window.dispatchEvent(new CustomEvent('pending-import'));
  };

  const handleMenuAction = (action: string) => {
    closeMenus();
    
    if (!window.electronAPI) {
      console.warn('Electron API non disponible');
      return;
    }
    
    // Actions liées aux raccourcis existants
    switch (action) {
      // === Fichier ===
      case 'lock':
        window.electronAPI.vault.lock();
        break;
      case 'manage-duplicates':
        window.electronAPI.vault.manageDuplicates();
        break;
      case 'export-selectif':
        window.electronAPI.vault.exportSelective();
        break;
      case 'export':
        handleExport();
        break;
      case 'import':
        handleImport();
        break;
      case 'quit':
        window.electronAPI.window.close();
        break;
      
      // === Édition ===
      case 'undo':
        document.execCommand('undo');
        break;
      case 'redo':
        document.execCommand('redo');
        break;
      case 'cut':
        document.execCommand('cut');
        break;
      case 'copy':
        document.execCommand('copy');
        break;
      case 'paste':
        document.execCommand('paste');
        break;
      case 'selectAll':
        document.execCommand('selectAll');
        break;
      
      // === Affichage ===
      case 'reload':
        window.location.reload();
        break;
      case 'forceReload':
        window.location.reload();
        break;
      case 'zoomIn':
        {
          const currentZoom = parseFloat(document.body.style.zoom || '1');
          document.body.style.zoom = `${currentZoom * 1.1}`;
        }
        break;
      case 'zoomOut':
        {
          const currentZoom = parseFloat(document.body.style.zoom || '1');
          document.body.style.zoom = `${currentZoom / 1.1}`;
        }
        break;
      case 'resetZoom':
        document.body.style.zoom = '1';
        break;
      
      // === Aide ===
      case 'docs':
        window.open('https://cryptos-services.com/docs/coffre', '_blank');
        break;
      case 'bug':
        window.open('https://github.com/cryptos-services/cryptos-coffre-desktop/issues', '_blank');
        break;
      case 'about':
        // console.log('🔔 Affichage du toast À propos...');
        toast.info(
          'Cryptos Coffre Desktop',
          `Version 1.0.2\n\nCoffre-Fort Numérique Sécurisé\n© ${new Date().getFullYear()} Cryptos Services\n\nChiffrement AES-GCM 256-bit\nArchitecture Zero-Knowledge`,
          7000 // 7 secondes pour lire
        );
        // console.log('✅ Toast créé avec succès');
        break;
      case 'license':
        if (onShowLicense) {
          onShowLicense();
        }
        break;
      
      default:
        // console.log(`Action non gérée: ${action}`);
    }
  };

  // Écoute les événements IPC du menu (raccourcis clavier Ctrl+E et Ctrl+I)
  useEffect(() => {
    if (!window.electronAPI) return;

    const exportHandler = () => {
      // console.log('📤 Export déclenché par IPC (Ctrl+E)');
      handleExport();
    };

    const importHandler = () => {
      // console.log('📥 Import déclenché par IPC (Ctrl+I)');
      handleImport();
    };

    // Enregistre les listeners
    window.electronAPI.vault.onExport(exportHandler);
    window.electronAPI.vault.onImport(importHandler);

    // Nettoyage au démontage
    return () => {
      window.electronAPI.vault.removeExportListener(exportHandler);
      window.electronAPI.vault.removeImportListener(importHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Tableau vide : enregistre une seule fois au montage

  return (
    <div className="custom-titlebar">
      {/* Ligne 1 : Logo + Contrôles (40px) */}
      <div className="titlebar-top-row">
        <div className="titlebar-drag-region">
          <div className="titlebar-branding">
            <div className="titlebar-icon">
              <img src={iconPath} alt="Cryptos Coffre"/>
            </div>
            <span className="titlebar-title">Cryptos Coffre</span>
          </div>
        </div>

        {/* Contrôles de fenêtre */}
        <div className="titlebar-controls">
          <button 
            className="control-button-minimize-button"
            onClick={handleMinimize}
            title="Réduire"
          >
            ─
          </button>
          <button 
            className="control-button-maximize-button"
            onClick={handleMaximize}
            title={isMaximized ? "Restaurer" : "Agrandir"}
          >
            {isMaximized ? '❐' : '☐'}
          </button>
          <button 
            className="control-button-close-button"
            onClick={handleClose}
            title="Fermer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Ligne 2 : Menu principal (20px) */}
      <div className="titlebar-bottom-row">
        <div className="titlebar-menu">
          <div className="menu-item">
            <button 
              className={`menu-button ${activeMenu === 'file' ? 'active' : ''}`}
              onClick={() => toggleMenu('file')}
            >
              Fichier
            </button>
            {activeMenu === 'file' && (
              <div className="menu-dropdown">
                <button onClick={() => handleMenuAction('lock')} disabled={!isVaultUnlocked}>
                  Verrouiller <span className="menu-shortcut">Ctrl+L</span>
                </button>
                <div className="menu-separator" />
                <button onClick={() => handleMenuAction('manage-duplicates')} disabled={!isVaultUnlocked}>
                  Gérer les Doublons <span className="menu-shortcut">Ctrl+D</span>
                </button> 

                {/*
                <button onClick={() => handleMenuAction('export-selectif')} disabled={!isVaultUnlocked}>
                  Export Séléctif <span className="menu-shortcut">Ctrl+Alt+E</span>
                </button> 
                */}

                <button onClick={() => handleMenuAction('export')} disabled={!isVaultUnlocked}>
                  Exporter Tout <span className="menu-shortcut">Ctrl+E</span>
                </button>           
                <button onClick={() => handleMenuAction('import')} disabled={!isVaultUnlocked}>
                  Importer <span className="menu-shortcut">Ctrl+I</span>
                </button>
                <div className="menu-separator" />
                <button onClick={() => handleMenuAction('quit')}>
                  Quitter <span className="menu-shortcut">Ctrl+Q</span>
                </button>
              </div>
            )}
          </div>

          <div className="menu-item">
            <button 
              className={`menu-button ${activeMenu === 'edit' ? 'active' : ''}`}
              onClick={() => toggleMenu('edit')}
            >
              Édition
            </button>
            {activeMenu === 'edit' && (
              <div className="menu-dropdown">
                <button onClick={() => handleMenuAction('undo')}>
                  Annuler <span className="menu-shortcut">Ctrl+Z</span>
                </button>
                <button onClick={() => handleMenuAction('redo')}>
                  Rétablir <span className="menu-shortcut">Shift+Ctrl+Z</span>
                </button>
                <div className="menu-separator" />
                <button onClick={() => handleMenuAction('cut')}>
                  Couper <span className="menu-shortcut">Ctrl+X</span>
                </button>
                <button onClick={() => handleMenuAction('copy')}>
                  Copier <span className="menu-shortcut">Ctrl+C</span>
                </button>
                <button onClick={() => handleMenuAction('paste')}>
                  Coller <span className="menu-shortcut">Ctrl+V</span>
                </button>
                <button onClick={() => handleMenuAction('selectAll')}>
                  Tout sélectionner <span className="menu-shortcut">Ctrl+A</span>
                </button>
              </div>
            )}
          </div>

          <div className="menu-item">
            <button 
              className={`menu-button ${activeMenu === 'view' ? 'active' : ''}`}
              onClick={() => toggleMenu('view')}
            >
              Affichage
            </button>
            {activeMenu === 'view' && (
              <div className="menu-dropdown">
                <button onClick={() => handleMenuAction('reload')}>
                  Recharger <span className="menu-shortcut">Ctrl+R</span>
                </button>
                <button onClick={() => handleMenuAction('forceReload')}>
                  Forcer le rechargement <span className="menu-shortcut">Ctrl+Shift+R</span>
                </button>
                <div className="menu-separator" />
                <button onClick={() => handleMenuAction('zoomIn')}>
                  Zoom + <span className="menu-shortcut">Ctrl++</span>
                </button>
                <button onClick={() => handleMenuAction('zoomOut')}>
                  Zoom - <span className="menu-shortcut">Ctrl+-</span>
                </button>
                <button onClick={() => handleMenuAction('resetZoom')}>
                  Zoom réel <span className="menu-shortcut">Ctrl+0</span>
                </button>
                <div className="menu-separator" />
                <button onClick={handleMaximize}>
                  Plein écran <span className="menu-shortcut">F11</span>
                </button>
              </div>
            )}
          </div>

          <div className="menu-item">
            <button 
              className={`menu-button ${activeMenu === 'help' ? 'active' : ''}`}
              onClick={() => toggleMenu('help')}
            >
              Aide
            </button>
            {activeMenu === 'help' && (
              <div className="menu-dropdown">
                <button onClick={() => handleMenuAction('docs')}>
                  Documentation
                </button>
                <button onClick={() => handleMenuAction('bug')}>
                  Signaler un bug
                </button>
                <div className="menu-separator" />
                <button onClick={() => handleMenuAction('license')}>
                  🔑 Gérer la licence
                </button>
                <button onClick={() => handleMenuAction('about')}>
                  À propos
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay pour fermer les menus */}
      {activeMenu && (
        <div className="menu-overlay" onClick={closeMenus} />
      )}
    </div>
  );
}
