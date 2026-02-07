'use client';

/**
 * Composant pour visualiser l'audit log
 */

import { useState, useMemo } from 'react';
import { useSecuritySettings } from '../hooks/useSecuritySettings';
import {
  getAuditLogs,
  getAuditLogsByAction,
  getAuditLogsByDateRange,
  exportAuditLogs,
  clearAuditLogs,
  getAuditLogStats,
  getFailedLoginStats,
} from '../lib/auditLog';
import { AuditActionType } from '../types/security';
import '../styles/SecuritySettings.css';

const ACTION_LABELS: Record<AuditActionType, string> = {
  'vault_unlock': '🔓 Déverrouillage',
  'vault_lock': '🔒 Verrouillage',
  'entry_create': '➕ Création entrée',
  'entry_update': '✏️ Modification entrée',
  'entry_delete': '🗑️ Suppression entrée',
  'entry_view': '👁️ Consultation entrée',
  'folder_create': '📁 Création dossier',
  'folder_update': '📝 Modification dossier',
  'folder_delete': '🗂️ Suppression dossier',
  'export_data': '📥 Export données',
  'import_data': '📤 Import données',
  '2fa_enable': '🔐 Activation 2FA',
  '2fa_disable': '🔓 Désactivation 2FA',
  '2fa_enabled': '🔐 2FA activée',
  '2fa_disabled': '🔓 2FA désactivée',
  '2fa_success': '✅ 2FA réussie',
  '2fa_failed': '❌ 2FA échouée',
  'recovery_codes_generate': '🔑 Génération codes',
  'recovery_code_used': '🎫 Utilisation code',
  'password_recovery': '🔄 Récupération mot de passe',
  'settings_update': '⚙️ Paramètres modifiés',
  'failed_login': '❌ Échec connexion',
};

export default function AuditLogViewer() {
  const { settings } = useSecuritySettings();
  const [filterAction, setFilterAction] = useState<AuditActionType | 'all'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showStats, setShowStats] = useState(false);

  const logs = useMemo(() => {
    if (filterAction !== 'all') {
      return getAuditLogsByAction(filterAction);
    }
    if (dateRange.start && dateRange.end) {
      return getAuditLogsByDateRange(new Date(dateRange.start), new Date(dateRange.end));
    }
    return getAuditLogs();
  }, [filterAction, dateRange]);

  const stats = useMemo(() => getAuditLogStats(), []);
  const failedLoginStats = useMemo(() => getFailedLoginStats(), []);

  const handleExport = () => {
    const json = exportAuditLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir effacer tout l\'historique d\'audit ? Cette action est irréversible.')) {
      return;
    }
    clearAuditLogs();
    alert('✅ Historique d\'audit effacé');
    window.location.reload();
  };

  return (
    <div className="security-settings-section">
      <h3>📋 Journal d&apos;Audit</h3>

      <div className="security-setting-item">
        <p className="security-setting-description">
          L&apos;historique de toutes les actions effectuées sur votre coffre.
          Conservation: {settings.auditLogRetention} jours.
        </p>
      </div>

      <div className="security-setting-item">
        <button
          onClick={() => setShowStats(!showStats)}
          className="vault-btn vault-btn-secondary"
        >
          {showStats ? '📊 Masquer' : '📊 Afficher'} les statistiques
        </button>
      </div>

      {showStats && (
        <div className="security-stats-grid">
          <div className="security-stat-card">
            <div className="security-stat-value">{logs.length}</div>
            <div className="security-stat-label">Total d&apos;événements</div>
          </div>
          <div className="security-stat-card">
            <div className="security-stat-value security-stat-danger">{failedLoginStats.count}</div>
            <div className="security-stat-label">Échecs de connexion</div>
          </div>
          <div className="security-stat-card">
            <div className="security-stat-value">{stats['vault_unlock'] || 0}</div>
            <div className="security-stat-label">Déverrouillages</div>
          </div>
        </div>
      )}

      <div className="audit-filters">
        <div className="security-setting-item">
          <label htmlFor="filterAction">Filtrer par action</label>
          <select
            id="filterAction"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as AuditActionType | 'all')}
            className="security-select"
          >
            <option value="all">Toutes les actions</option>
            {Object.entries(ACTION_LABELS).map(([action, label]) => (
              <option key={action} value={action}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="audit-date-filters">
          <div className="security-setting-item">
            <label htmlFor="dateStart">Date début</label>
            <input
              id="dateStart"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="audit-date-input"
            />
          </div>
          <div className="security-setting-item">
            <label htmlFor="dateEnd">Date fin</label>
            <input
              id="dateEnd"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="audit-date-input"
            />
          </div>
        </div>
      </div>

      <div className="security-setting-item">
        <div className="security-button-group">
          <button
            onClick={handleExport}
            className="vault-btn vault-btn-secondary"
          >
            💾 Exporter (JSON)
          </button>
          <button
            onClick={handleClear}
            className="vault-btn vault-btn-danger"
          >
            🗑️ Effacer l&apos;historique
          </button>
        </div>
      </div>

      <div className="audit-log-container">
        <div className="audit-log-header">
          <span>{logs.length} événement(s)</span>
        </div>
        <div className="audit-log-list">
          {logs.length === 0 ? (
            <div className="audit-log-empty">
              Aucun événement trouvé
            </div>
          ) : (
            logs.slice(0, 100).map((log) => (
              <div key={log.id} className="audit-log-entry">
                <div className="audit-log-entry-header">
                  <span className="audit-log-action">
                    {ACTION_LABELS[log.action]}
                  </span>
                  <span className="audit-log-time">
                    {new Date(log.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="audit-log-details">
                    {log.details.entryName && <span>📝 {log.details.entryName}</span>}
                    {log.details.folderName && <span>📁 {log.details.folderName}</span>}
                    {log.details.success !== undefined && (
                      <span className={log.details.success ? 'audit-success' : 'audit-error'}>
                        {log.details.success ? '✅ Succès' : '❌ Échec'}
                      </span>
                    )}
                    {log.details.errorMessage && (
                      <span className="audit-error">⚠️ {log.details.errorMessage}</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        {logs.length > 100 && (
          <div className="audit-log-footer">
            Affichage des 100 événements les plus récents sur {logs.length}
          </div>
        )}
      </div>
    </div>
  );
}
