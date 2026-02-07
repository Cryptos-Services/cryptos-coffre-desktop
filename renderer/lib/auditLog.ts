/**
 * Gestion du journal d'audit pour tracer toutes les actions
 */

import { AuditLogEntry, AuditActionType } from '../types/security';

const AUDIT_LOG_KEY = 'vault-audit-log';
const MAX_LOG_ENTRIES = 1000; // Limite pour éviter un localStorage trop volumineux

/**
 * Ajoute une entrée au journal d'audit
 */
export function addAuditLog(
  action: AuditActionType,
  details?: AuditLogEntry['details']
): void {
  try {
    const logs = getAuditLogs();
    
    const newEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      action,
      timestamp: new Date().toISOString(),
      details,
    };
    
    // Ajoute au début (plus récent en premier)
    logs.unshift(newEntry);
    
    // Limite le nombre d'entrées
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.splice(MAX_LOG_ENTRIES);
    }
    
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Erreur lors de l\'ajout au journal d\'audit:', error);
  }
}

/**
 * Récupère tous les logs d'audit
 */
export function getAuditLogs(): AuditLogEntry[] {
  try {
    const stored = localStorage.getItem(AUDIT_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Récupère les logs filtrés par action
 */
export function getAuditLogsByAction(action: AuditActionType): AuditLogEntry[] {
  return getAuditLogs().filter(log => log.action === action);
}

/**
 * Récupère les logs dans une période
 */
export function getAuditLogsByDateRange(
  startDate: Date,
  endDate: Date
): AuditLogEntry[] {
  const logs = getAuditLogs();
  return logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= startDate && logDate <= endDate;
  });
}

/**
 * Nettoie les logs plus anciens que X jours
 */
export function cleanOldAuditLogs(retentionDays: number): void {
  try {
    const logs = getAuditLogs();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const filtered = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= cutoffDate;
    });
    
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Erreur lors du nettoyage des logs:', error);
  }
}

/**
 * Exporte les logs en JSON
 */
export function exportAuditLogs(): string {
  const logs = getAuditLogs();
  return JSON.stringify(logs, null, 2);
}

/**
 * Efface complètement le journal d'audit
 */
export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_LOG_KEY);
}

/**
 * Compte le nombre de logs par type d'action
 */
export function getAuditLogStats(): Record<AuditActionType, number> {
  const logs = getAuditLogs();
  const stats: Partial<Record<AuditActionType, number>> = {};
  
  logs.forEach(log => {
    stats[log.action] = (stats[log.action] || 0) + 1;
  });
  
  return stats as Record<AuditActionType, number>;
}

/**
 * Obtient les statistiques d'échecs de connexion
 */
export function getFailedLoginStats(): {
  count: number;
  lastAttempt?: string;
  recentAttempts: AuditLogEntry[];
} {
  const failedLogins = getAuditLogsByAction('failed_login');
  
  return {
    count: failedLogins.length,
    lastAttempt: failedLogins[0]?.timestamp,
    recentAttempts: failedLogins.slice(0, 10),
  };
}
