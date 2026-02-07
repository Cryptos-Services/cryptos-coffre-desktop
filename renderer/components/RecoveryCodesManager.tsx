'use client';

/**
 * Composant pour gérer les codes de récupération
 */

import { useState } from 'react';
import { useSecuritySettings } from '../hooks/useSecuritySettings';
import { useVault } from '../hooks/useVault';
import { formatCodeForDisplay } from '../lib/recoveryCodes';
import { addAuditLog, getAuditLogsByAction } from '../lib/auditLog';
import '../styles/SecuritySettings.css';

export default function RecoveryCodesManager() {
  const { settings, generateNewRecoveryCodes, getRecoveryCodeStats } = useSecuritySettings();
  const { entries } = useVault();
  const [showCodes, setShowCodes] = useState(false);
  const [copied, setCopied] = useState(false);

  const stats = getRecoveryCodeStats();

  // Détecte si une récupération a eu lieu APRÈS la génération des codes
  const codesCreatedAt = settings.encryptedRecoveryKey?.createdAt 
    ? new Date(settings.encryptedRecoveryKey.createdAt) 
    : null;
  
  const recoveryLogs = getAuditLogsByAction('password_recovery');
  const lastRecovery = recoveryLogs.length > 0 ? new Date(recoveryLogs[0].timestamp) : null;
  const recoveryAfterCodes = lastRecovery && codesCreatedAt && lastRecovery > codesCreatedAt;
  
  // Détecte si des entrées ont été ajoutées APRÈS la génération des codes
  const hasRecentEntries = entries.some(entry => 
    codesCreatedAt && new Date(entry.createdAt) > codesCreatedAt
  );
  const potentiallyInvalidCodes = hasRecentEntries && settings.recoveryCodesGenerated;

  const handleGenerateCodes = async () => {
    if (settings.recoveryCodesGenerated) {
      if (!confirm('⚠️ Générer de nouveaux codes invalidera les codes existants. Continuer ?')) {
        return;
      }
    }

    // Si la passphrase n'est pas en sessionStorage (page rechargée), demande-la
    let passphrase = sessionStorage.getItem('vault_passphrase_temp');
    if (!passphrase) {
      passphrase = prompt('🔐 Entrez votre passphrase maître pour générer les codes de récupération:');
      if (!passphrase) {
        return; // L'utilisateur a annulé
      }
      // Stocke pour generateNewRecoveryCodes
      sessionStorage.setItem('vault_passphrase_temp', passphrase);
    }

    try {
      // console.log('🔐 Génération des codes de récupération...');
      const newCodes = await generateNewRecoveryCodes();
      setShowCodes(true);
      
      addAuditLog('recovery_codes_generate', {
        success: true,
      });

      alert(
        `✅ ${newCodes.length} nouveaux codes de récupération générés !\n\n` +
        '🔐 IMPORTANT:\n' +
        '1. Sauvegardez ces codes dans un lieu sûr\n' +
        '2. Ces codes permettent la RÉCUPÉRATION SANS PERTE de données\n' +
        '3. Les anciens codes ne fonctionneront plus\n' +
        '4. Testez un code pour vérifier que la récupération fonctionne'
      );
    } catch (error) {
      console.error('❌ Erreur détaillée génération codes:', error);
      console.error('Stack trace:', (error as Error).stack);
      
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      
      alert(
        '❌ Erreur lors de la génération des codes:\n\n' +
        errorMsg + '\n\n' +
        'Vérifiez la console (F12) pour plus de détails.'
      );
    }
  };

  const handleCopyAll = () => {
    const codesText = settings.recoveryCodes
      .map(rc => formatCodeForDisplay(rc.code))
      .join('\n');
    
    navigator.clipboard.writeText(codesText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleDownload = () => {
    const codesText = settings.recoveryCodes
      .map(rc => formatCodeForDisplay(rc.code))
      .join('\n');
    
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recovery-codes-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=600,height=400');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Codes de Récupération - Cryptos Coffre</title>
          <style>
            body { font-family: monospace; padding: 2rem; }
            h1 { font-size: 1.5rem; margin-bottom: 1rem; }
            .code { font-size: 1.2rem; margin: 0.5rem 0; padding: 0.5rem; background: #f3f4f6; }
            .footer { margin-top: 2rem; font-size: 0.875rem; color: #666; }
          </style>
        </head>
        <body>
          <h1>🔐 Codes de Récupération - Cryptos Coffre</h1>
          <p>Conservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu&apos;une seule fois.</p>
          ${settings.recoveryCodes.map(rc => 
            `<div class="code">${formatCodeForDisplay(rc.code)}${rc.used ? ' (UTILISÉ)' : ''}</div>`
          ).join('')}
          <div class="footer">
            Généré le ${new Date(settings.createdAt).toLocaleDateString('fr-FR')} | 
            ${stats.unused}/${stats.total} codes restants
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="security-settings-section">
      <h3>🔑 Codes de Récupération</h3>

      <div className="security-setting-item">
        <p className="security-setting-description">
          Les codes de récupération permettent d&apos;accéder à votre coffre si vous perdez l&apos;accès
          à votre authentification 2FA. Chaque code ne peut être utilisé qu&apos;une seule fois.
        </p>
      </div>

      <div className={`security-stats-grid ${recoveryAfterCodes ? 'recovery-stats-grid-invalid' : ''}`}>
        <div className="security-stat-card">
          <div className="security-stat-value">{stats.total}</div>
          <div className="security-stat-label">Codes générés</div>
        </div>
        <div className="security-stat-card">
          <div className={`security-stat-value ${recoveryAfterCodes ? 'recovery-stat-value-invalid' : ''}`}>{stats.unused}</div>
          <div className="security-stat-label">
            {recoveryAfterCodes ? '⚠️ Codes obsolètes' : 'Codes disponibles'}
          </div>
        </div>
        <div className="security-stat-card">
          <div className="security-stat-value security-stat-danger">{stats.used}</div>
          <div className="security-stat-label">Codes utilisés</div>
        </div>
      </div>

      {/* CRITIQUE : Récupération effectuée après génération des codes */}
      {recoveryAfterCodes && (
        <div className="security-info-box security-info-box-error recovery-critical-alert">
          <h4 className="security-info-box-error-title">🚨 DANGER CRITIQUE - TOUS LES CODES SONT INVALIDES 🚨</h4>
          <p className="security-info-box-error-text recovery-critical-text">
            Vous avez utilisé un code de récupération le {lastRecovery?.toLocaleString('fr-FR')}.<br/>
            <strong className="recovery-critical-highlight">Les {stats.unused} codes &quot;disponibles&quot; affichés ci-dessus sont en réalité INVALIDES !</strong>
          </p>
          <p className="security-info-box-error-text">
            ⚠️ La récupération a changé votre passphrase maître.<br/>
            🔴 <strong>TOUS les anciens codes (même non utilisés) ne fonctionnent plus.</strong><br/>
            📅 Codes générés le : {codesCreatedAt?.toLocaleString('fr-FR')}<br/>
            🔄 Récupération effectuée le : {lastRecovery?.toLocaleString('fr-FR')}
          </p>
          <button
            onClick={handleGenerateCodes}
            className="vault-btn vault-btn-primary recovery-regenerate-btn"
          >
            🆘 RÉGÉNÉRER LES CODES MAINTENANT
          </button>
        </div>
      )}

      {/* Avertissement si pas de clé de récupération chiffrée */}
      {!recoveryAfterCodes && settings.recoveryCodesGenerated && !settings.encryptedRecoveryKey && (
        <div className="security-info-box security-info-box-error">
          <h4 className="security-info-box-error-title">⚠️ Codes obsolètes détectés</h4>
          <p className="security-info-box-error-text">
            Vos codes actuels ont été générés avec l&apos;ancien système.<br/>
            <strong>Ils ne permettent PAS de récupérer vos données sans perte.</strong>
          </p>
          <p className="security-info-box-error-text">
            🔴 Action requise : Régénérez de NOUVEAUX codes immédiatement<br/>
            (le coffre doit être déverrouillé)
          </p>
        </div>
      )}

      {/* Avertissement si des entrées ont été ajoutées APRÈS la génération des codes */}
      {!recoveryAfterCodes && potentiallyInvalidCodes && (
        <div className="security-info-box security-info-box-error">
          <h4 className="security-info-box-error-title">🔴 DANGER - Codes potentiellement invalides</h4>
          <p className="security-info-box-error-text">
            Vous avez ajouté des entrées APRÈS la génération des codes de récupération.<br/>
            <strong>Ces codes ne pourront PAS récupérer vos nouvelles entrées !</strong>
          </p>
          <p className="security-info-box-error-text">
            ⚠️ Codes générés le : {codesCreatedAt?.toLocaleDateString('fr-FR')}<br/>
            📊 Entrées totales : {entries.length}<br/>
            🔴 <strong>RÉGÉNÉREZ les codes MAINTENANT</strong> pour protéger toutes vos données
          </p>
        </div>
      )}

      {!settings.recoveryCodesGenerated ? (
        <div className="security-setting-item">
          <button
            onClick={handleGenerateCodes}
            className="vault-btn vault-btn-primary"
          >
            🎲 Générer des codes de récupération
          </button>
        </div>
      ) : (
        <>
          <div className="security-setting-item">
            <div className="security-button-group">
              <button
                onClick={() => setShowCodes(!showCodes)}
                className="vault-btn vault-btn-secondary"
              >
                {showCodes ? '🙈 Masquer' : '👁️ Afficher'} les codes
              </button>
              <button
                onClick={handleGenerateCodes}
                className="vault-btn vault-btn-secondary"
              >
                🔄 Régénérer
              </button>
            </div>
          </div>

          {showCodes && (
            <div className="security-setting-item">
              <div className="recovery-codes-container">
                <div className="recovery-codes-header">
                  <span>Vos codes de récupération</span>
                  <div className="security-button-group">
                    <button
                      onClick={handleCopyAll}
                      className="vault-btn vault-btn-secondary"
                      disabled={copied}
                    >
                      {copied ? '✅ Copié' : '📋 Copier tout'}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="vault-btn vault-btn-secondary"
                    >
                      💾 Télécharger
                    </button>
                    <button
                      onClick={handlePrint}
                      className="vault-btn vault-btn-secondary"
                    >
                      🖨️ Imprimer
                    </button>
                  </div>
                </div>
                <div className="recovery-codes-grid">
                  {settings.recoveryCodes.map((rc, index) => (
                    <div
                      key={index}
                      className={`recovery-code ${rc.used ? 'recovery-code-used' : ''}`}
                    >
                      <span className="recovery-code-text">
                        {formatCodeForDisplay(rc.code)}
                      </span>
                      {rc.used && (
                        <span className="recovery-code-badge">
                          ✓ Utilisé le {new Date(rc.usedAt!).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="security-info-box">
        <p>
          <strong>ℹ️ Bonnes pratiques:</strong>
        </p>
        <ul className="security-info-list">
          <li>Imprimez ou téléchargez vos codes et conservez-les en lieu sûr</li>
          <li>Ne partagez jamais vos codes de récupération</li>
          <li>Régénérez de nouveaux codes si vous pensez qu&apos;ils ont été compromis</li>
          <li>Chaque code ne fonctionne qu&apos;une seule fois</li>
        </ul>
      </div>
    </div>
  );
}
