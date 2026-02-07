'use client';

/**
 * Interface complète des paramètres de sécurité
 */

import { useState } from 'react';
import SecurityAutoLockSettings from './SecurityAutoLockSettings';
import WebAuthnManager from './WebAuthnManager';
import TOTPManager from './TOTPManager';
import RecoveryCodesManager from './RecoveryCodesManager';
import AuditLogViewer from './AuditLogViewer';
import PassphraseHintManager from './PassphraseHintManager';
import VaultReset from './VaultReset';
import VaultExport from './VaultExport';
import { useSecuritySettings } from '../hooks/useSecuritySettings';
import '../styles/SecuritySettings.css';

type SecurityTab = 'autolock' | '2fa' | 'recovery' | 'audit' | 'advanced';

interface SecuritySettingsProps {
  initialTab?: SecurityTab;
}

export default function SecuritySettings({ initialTab = 'autolock' }: SecuritySettingsProps) {
  const [activeTab, setActiveTab] = useState<SecurityTab>(initialTab);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { settings, resetToDefaults } = useSecuritySettings();

  const handleResetDefaults = () => {
    if (!confirm('⚠️ Réinitialiser tous les paramètres de sécurité aux valeurs par défaut ? Cette action est irréversible.')) {
      return;
    }
    resetToDefaults();
    alert('✅ Paramètres réinitialisés aux valeurs par défaut');
  };

  return (
    <div className="security-settings-container">
      <div className="security-settings-header">
        <h2>⚙️ Paramètres de Sécurité</h2>
        {/*
        <button
          onClick={() => {
            const section = document.querySelector('.security-settings-container');
            section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="vault-btn vault-btn-secondary"
        >
          ⬆️ Haut de page
        </button>
        */}
      </div>

      <div className="security-tabs">
        <button
          onClick={() => setActiveTab('autolock')}
          className={`security-tab ${activeTab === 'autolock' ? 'security-tab-active' : ''}`}
        >
          🔒 Auto-Lock
        </button>
        <button
          onClick={() => setActiveTab('2fa')}
          className={`security-tab ${activeTab === '2fa' ? 'security-tab-active' : ''}`}
        >
          🔐 Authentification 2FA
        </button>
        <button
          onClick={() => setActiveTab('recovery')}
          className={`security-tab ${activeTab === 'recovery' ? 'security-tab-active' : ''}`}
        >
          🔑 Récupération
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`security-tab ${activeTab === 'audit' ? 'security-tab-active' : ''}`}
        >
          📋 Journal d&apos;Audit
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`security-tab ${activeTab === 'advanced' ? 'security-tab-active' : ''}`}
        >
          🛠️ Avancé
        </button>
      </div>

      <div className="security-tab-content">
        {activeTab === 'autolock' && <SecurityAutoLockSettings />}
        {activeTab === '2fa' && (
          <>
            <div className='security-group-recovery'>
              <WebAuthnManager />
              {/* <div className='security-tab-content-divider'></div> */}
              <TOTPManager />
            </div>
          </>
        )}
        {activeTab === 'recovery' && (
          <>
            <div className='security-group-recovery'>
              <RecoveryCodesManager />
              {/* <div className='security-tab-content-divider'></div> */}
              <PassphraseHintManager />
            </div>
          </>
        )}
        {activeTab === 'audit' && <AuditLogViewer />}
        {activeTab === 'advanced' && (
          <div className="security-settings-section">
            <h3>🛠️ Paramètres Avancés</h3>

            <div className="security-setting-item">
              <h4>Protection Anti-Brute Force</h4>
              <p className="security-setting-description">
                Limite le nombre de tentatives de connexion échouées avant verrouillage temporaire.
              </p>
              <div className="security-stats-grid">
                <div className="security-stat-card">
                  <div className="security-stat-value">{settings.maxLoginAttempts}</div>
                  <div className="security-stat-label">Tentatives max</div>
                </div>
                <div className="security-stat-card">
                  <div className="security-stat-value">{settings.lockoutDuration}</div>
                  <div className="security-stat-label">Durée verrouillage (min)</div>
                </div>
              </div>
            </div>

            <div className="security-setting-item">
              <h4>Journal d&apos;Audit</h4>
              <div className="security-toggle-label">
                <span>
                  Conservation des logs: {settings.auditLogRetention} jours
                </span>
              </div>
              <p className="security-setting-description">
                Les événements plus anciens sont automatiquement supprimés.
              </p>
            </div>

            <div className="security-setting-item">
              <h4>Informations Système</h4>
              <div className="security-info-grid">
                <div className="security-info-item">
                  <span className="security-info-label">Paramètres créés:</span>
                  <span className="security-info-value">
                    {new Date(settings.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div className="security-info-item">
                  <span className="security-info-label">Dernière modification:</span>
                  <span className="security-info-value">
                    {new Date(settings.updatedAt).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="security-setting-item">
              <h4>💾 Sauvegarde et Restauration</h4>
              <p className="security-setting-description">
                Exportez votre coffre-fort complet (entrées chiffrées, paramètres, dossiers) dans un fichier .vault.<br/>
                Ce fichier peut être importé pour restaurer votre coffre sur un autre appareil ou après une réinitialisation.
              </p>
              <button
                onClick={() => setShowExportModal(true)}
                className="vault-btn vault-btn-primary"
              >
                💾 Export / Import du Coffre
              </button>
            </div>

            <div className="security-setting-item">
              <h4>Réinitialisation des paramètres</h4>
              <p className="security-setting-description">
                Réinitialise tous les paramètres de sécurité aux valeurs par défaut.
                Les credentials 2FA et codes de récupération seront conservés.
              </p>
              <button
                onClick={handleResetDefaults}
                className="vault-btn vault-btn-danger"
              >
                🔄 Réinitialiser les paramètres
              </button>
            </div>

            <div className="security-setting-item security-danger-zone">
              <h4>🔴 Zone Dangereuse - Réinitialisation Complète</h4>
              <p className="security-setting-description">
                <strong>Supprime DÉFINITIVEMENT toutes les données du coffre-fort.</strong><br/>
                Toutes vos entrées, paramètres, codes de récupération et historiques seront perdus.<br/>
                Le coffre reviendra à l&apos;état initial comme si vous ne l&apos;aviez jamais utilisé.
              </p>
              <p className="security-warning-text">
                ⚠️ <strong>Attention :</strong> Cette action est IRRÉVERSIBLE !<br/>
                Utilisez ceci uniquement si vous êtes bloqué ou voulez repartir de zéro.
              </p>
              <button
                onClick={() => setShowResetModal(true)}
                className="vault-btn vault-btn-danger"
              >
                🔴 Réinitialiser TOUT le coffre-fort
              </button>
            </div>

            <div className="security-info-box">
              <p>
                <strong>ℹ️ Valeurs par défaut:</strong>
              </p>
              <ul className="security-info-list">

      {/* Modal Export/Import */}
      {showExportModal && (
        <VaultExport onClose={() => setShowExportModal(false)} />
      )}
                <li>Auto-lock: Activé, 10 minutes</li>
                <li>2FA: Désactivée</li>
                <li>Journal d&apos;audit: Activé, 90 jours</li>
                <li>Max tentatives: 5, Verrouillage: 5 minutes</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Modal de réinitialisation complète */}
      {showResetModal && (
        <VaultReset onClose={() => setShowResetModal(false)} />
      )}
    </div>
  );
}
