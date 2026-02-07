'use client';

/**
 * Composant d'export/import du coffre-fort
 * Permet de sauvegarder et restaurer tout le coffre
 */

import { useState } from 'react';
import { useVault } from '../hooks/useVault';
import { useSecuritySettings } from '../hooks/useSecuritySettings';
import '../styles/SecuritySettings.css';

interface VaultExportProps {
  onClose: () => void;
}

export default function VaultExport({ onClose }: VaultExportProps) {
  const { entries } = useVault();
  const { settings } = useSecuritySettings();
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [importing, setImporting] = useState(false);

  /**
   * Exporte le coffre complet (chiffré)
   */
  const handleExport = async () => {
    try {
      // 1. Récupère TOUTES les données
      const vaultSalt = localStorage.getItem('vault_salt');
      const vaultFolders = localStorage.getItem('vault-folders');
      const auditLogs = localStorage.getItem('audit-logs');

      if (!vaultSalt) {
        alert('❌ Aucun coffre trouvé. Créez d\'abord un coffre.');
        return;
      }

      // 2. Récupère les entrées depuis localStorage (version chiffrée)
      const vaultDataStr = localStorage.getItem('vault_data');
      const serverEntries = vaultDataStr ? JSON.parse(vaultDataStr) : [];

      // 3. Prépare le fichier d'export
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        vault: {
          salt: vaultSalt,
          entries: serverEntries, // Déjà chiffrées
          folders: vaultFolders ? JSON.parse(vaultFolders) : [],
        },
        security: settings,
        audit: auditLogs ? JSON.parse(auditLogs) : [],
      };

      // 4. Crée le fichier
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cryptos-vault-${new Date().toISOString().split('T')[0]}.vault`;
      link.click();
      URL.revokeObjectURL(url);

      alert(
        `✅ Coffre exporté avec succès !\n\n` +
        `📦 Fichier : cryptos-vault-${new Date().toISOString().split('T')[0]}.vault\n` +
        `📊 ${serverEntries.length} entrée(s)\n\n` +
        `⚠️ IMPORTANT :\n` +
        `Ce fichier contient vos données CHIFFRÉES.\n` +
        `Conservez-le en lieu sûr avec votre passphrase.`
      );
    } catch (error) {
      console.error('Erreur export:', error);
      alert('❌ Erreur lors de l\'export. Vérifiez la console (F12).');
    }
  };

  /**
   * Importe un coffre depuis un fichier .vault
   */
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.vault')) {
      alert('❌ Fichier invalide. Utilisez un fichier .vault');
      return;
    }

    if (!confirm(
      '⚠️ ATTENTION - Import de coffre\n\n' +
      'Cette action va REMPLACER votre coffre actuel.\n' +
      'Voulez-vous continuer ?'
    )) {
      return;
    }

    setImporting(true);

    try {
      // 1. Lit le fichier
      const text = await file.text();
      const importData = JSON.parse(text);

      // 2. Valide la structure
      if (!importData.version || !importData.vault || !importData.vault.salt) {
        throw new Error('Fichier .vault invalide ou corrompu');
      }

      // 3. Restaure le localStorage
      localStorage.setItem('vault_salt', importData.vault.salt);
      localStorage.setItem('security-settings', JSON.stringify(importData.security));
      
      if (importData.vault.folders && importData.vault.folders.length > 0) {
        localStorage.setItem('vault-folders', JSON.stringify(importData.vault.folders));
      }
      
      if (importData.audit && importData.audit.length > 0) {
        localStorage.setItem('audit-logs', JSON.stringify(importData.audit));
      }

      // 4. Restaure les entrées dans localStorage
      localStorage.setItem('vault_data', JSON.stringify(importData.vault.entries));

      alert(
        '✅ Coffre importé avec succès !\n\n' +
        `📦 ${importData.vault.entries.length} entrée(s) restaurée(s)\n\n` +
        'La page va se recharger...'
      );

      // 5. Recharge la page pour appliquer les changements
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Erreur import:', error);
      alert(
        '❌ Erreur lors de l\'import:\n\n' +
        (error instanceof Error ? error.message : 'Erreur inconnue') +
        '\n\nVérifiez que le fichier .vault est valide.'
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="vault-modal-overlay" onClick={onClose}>
      <div className="vault-modal vault-export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vault-modal-header">
          <h2>💾 Export/Import du Coffre-Fort</h2>
          {/* <button onClick={onClose} className="vault-modal-close">✕</button> */}
        </div>

        <div className="vault-modal-body">
          <div className="vault-export-tabs">
            <button
              className={`vault-export-tab ${mode === 'export' ? 'active' : ''}`}
              onClick={() => setMode('export')}
            >
              📤 Export
            </button>
            <button
              className={`vault-export-tab ${mode === 'import' ? 'active' : ''}`}
              onClick={() => setMode('import')}
            >
              📥 Import
            </button>
          </div>

          {mode === 'export' ? (
            <>
              <div className="security-info-box">
                <h4>📦 Export du coffre complet</h4>
                <p>
                  Cette fonction télécharge <strong>tout votre coffre-fort</strong> dans un fichier `.vault` :
                </p>
                <ul className="vault-export-list">
                  <li>✅ Toutes vos entrées (chiffrées)</li>
                  <li>✅ Vos dossiers et organisations</li>
                  <li>✅ Vos paramètres de sécurité</li>
                  <li>✅ Votre historique d&apos;audit</li>
                </ul>
                <p>
                  <strong>📊 État actuel :</strong><br/>
                  • {entries.length} entrée(s)<br/>
                  • Salt : {localStorage.getItem('vault_salt') ? '✅ Présent' : '❌ Absent'}
                </p>
              </div>

              <div className="security-info-box security-info-box-warning">
                <h4>🔐 Sécurité</h4>
                <p>
                  Le fichier .vault contient vos données <strong>CHIFFRÉES</strong>.<br/>
                  Seule votre passphrase peut les déchiffrer.
                </p>
                <p>
                  <strong>Bonnes pratiques :</strong><br/>
                  • Sauvegardez ce fichier en lieu sûr (clé USB, cloud personnel)<br/>
                  • Ne partagez JAMAIS votre passphrase<br/>
                  • Testez l&apos;import après chaque export
                </p>
              </div>

              <div className="vault-export-actions">
                <button onClick={onClose} className="vault-btn vault-btn-secondary">
                  Annuler
                </button>
                <button
                  onClick={handleExport}
                  className="vault-btn vault-btn-primary"
                >
                  📤 Exporter maintenant
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="security-info-box">
                <h4>📥 Import d&apos;un coffre</h4>
                <p>
                  Restaurez votre coffre-fort depuis un fichier `.vault` exporté précédemment.
                </p>
              </div>

              <div className="security-info-box security-info-box-error">
                <h4 className="security-info-box-error-title">⚠️ ATTENTION</h4>
                <p className="security-info-box-error-text">
                  L&apos;import va <strong>REMPLACER</strong> votre coffre actuel.<br/>
                  Exportez d&apos;abord votre coffre actuel si vous voulez le conserver.
                </p>
              </div>

              <div className="vault-import-zone">
                <label htmlFor="vault-import-file" className="vault-import-label">
                  {importing ? (
                    <>⏳ Import en cours...</>
                  ) : (
                    <>📁 Choisir un fichier .vault</>
                  )}
                </label>
                <input
                  id="vault-import-file"
                  type="file"
                  accept=".vault"
                  onChange={handleImport}
                  disabled={importing}
                  className="vault-import-input"
                />
              </div>

              <div className="vault-export-actions">
                <button onClick={onClose} className="vault-btn vault-btn-secondary">
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
