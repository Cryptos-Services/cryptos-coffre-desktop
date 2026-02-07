/**
 * Utilitaires pour l'import de coffres depuis d'autres gestionnaires de mots de passe
 */

import { CreateEntryParams } from '../types/vault';

/**
 * Détecte le format du fichier importé
 */
export function detectImportFormat(filename: string, content: string): 'vault-json' | 'kaspersky-txt' | 'kaspersky-csv' | 'generic-csv' | 'unknown' {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  // Format natif du coffre
  if (ext === 'json') {
    try {
      const parsed = JSON.parse(content);
      if (parsed.version && parsed.salt && parsed.entries) {
        return 'vault-json';
      }
    } catch {
      return 'unknown';
    }
  }
  
  // Format Kaspersky TXT
  if (ext === 'txt' && (content.includes('Website name:') || content.includes('Application:') || content.includes('Login name:'))) {
    return 'kaspersky-txt';
  }
  
  // Format Kaspersky CSV ou CSV générique
  if (ext === 'csv') {
    const lines = content.split('\n');
    const header = lines[0]?.toLowerCase();
    if (header?.includes('website name') || header?.includes('account') || header?.includes('login name')) {
      return 'kaspersky-csv';
    }
    return 'generic-csv';
  }
  
  return 'unknown';
}

/**
 * Parse le format TXT de Kaspersky
 * Format exemple:
 * Website name: Example
 * Website URL: https://example.com
 * Login name: user@example.com
 * Password: mypassword123
 * Comment: Notes here
 */
export function parseKasperskyTXT(content: string): CreateEntryParams[] {
  const entries: CreateEntryParams[] = [];
  const blocks = content.split(/\n\s*\n/); // Sépare les entrées par lignes vides
  
  for (const block of blocks) {
    const lines = block.split('\n').filter(l => l.trim());
    if (lines.length === 0) continue;
    
    let name = '';
    let username = '';
    let password = '';
    let url = '';
    let notes = '';
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      if (!value) continue;
      
      const keyLower = key.trim().toLowerCase();
      
      if (keyLower.includes('website name') || keyLower.includes('application')) {
        name = value;
      } else if (keyLower.includes('website url') || keyLower.includes('url')) {
        url = value;
      } else if (keyLower.includes('login name') || keyLower.includes('login') || keyLower.includes('username')) {
        username = value;
      } else if (keyLower.includes('password')) {
        password = value;
      } else if (keyLower.includes('comment') || keyLower.includes('note')) {
        notes = value;
      }
    }
    
    if (name && (password || username)) {
      entries.push({
        type: 'password',
        name: name || 'Entrée importée',
        data: {
          username: username || '',
          password: password || '',
        },
        meta: {
          url: url || '',
          category: `Importé depuis Kaspersky${notes ? ' - ' + notes : ''}`,
        },
      });
    }
  }
  
  return entries;
}

/**
 * Parse le format CSV de Kaspersky
 * Format: Website name,Website URL,Login name,Password,Comment
 */
export function parseKasperskyCSV(content: string): CreateEntryParams[] {
  const entries: CreateEntryParams[] = [];
  const lines = content.split('\n').filter(l => l.trim());
  
  if (lines.length < 2) return entries; // Pas de données
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  
  // Trouve les indices des colonnes
  const nameIdx = headers.findIndex(h => h.includes('website name') || h.includes('application') || h.includes('name'));
  const urlIdx = headers.findIndex(h => h.includes('url') || h.includes('website url'));
  const loginIdx = headers.findIndex(h => h.includes('login') || h.includes('username'));
  const passwordIdx = headers.findIndex(h => h.includes('password'));
  const commentIdx = headers.findIndex(h => h.includes('comment') || h.includes('note'));
  
  // Parse chaque ligne
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV avec gestion des guillemets
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Ajoute la dernière valeur
    
    const name = nameIdx >= 0 ? values[nameIdx]?.replace(/"/g, '') : '';
    const url = urlIdx >= 0 ? values[urlIdx]?.replace(/"/g, '') : '';
    const username = loginIdx >= 0 ? values[loginIdx]?.replace(/"/g, '') : '';
    const password = passwordIdx >= 0 ? values[passwordIdx]?.replace(/"/g, '') : '';
    const notes = commentIdx >= 0 ? values[commentIdx]?.replace(/"/g, '') : '';
    
    if (name && (password || username)) {
      entries.push({
        type: 'password',
        name: name || 'Entrée importée',
        data: {
          username: username || '',
          password: password || '',
        },
        meta: {
          url: url || '',
          category: `Importé depuis Kaspersky${notes ? ' - ' + notes : ''}`,
        },
      });
    }
  }
  
  return entries;
}

/**
 * Parse un CSV générique (format minimal: nom,utilisateur,mot de passe)
 */
export function parseGenericCSV(content: string): CreateEntryParams[] {
  const entries: CreateEntryParams[] = [];
  const lines = content.split('\n').filter(l => l.trim());
  
  if (lines.length < 2) return entries;
  
  // Parse chaque ligne (ignore la première ligne d'en-tête)
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    
    if (values.length >= 3) {
      entries.push({
        type: 'password',
        name: values[0] || 'Entrée importée',
        data: {
          username: values[1] || '',
          password: values[2] || '',
        },
        meta: {
          url: values[3] || '',
          category: `Importé depuis CSV${values[4] ? ' - ' + values[4] : ''}`,
        },
      });
    }
  }
  
  return entries;
}
