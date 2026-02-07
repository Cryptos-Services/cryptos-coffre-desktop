/**
 * Utilitaires pour détecter et gérer les doublons dans le coffre
 */

import { DecryptedEntry } from '../types/vault';

/**
 * Détecte les doublons dans une liste d'entrées
 * Critères : même nom ET (même username OU même password)
 */
export function detectDuplicates(entries: DecryptedEntry[]): {
  duplicates: Array<{
    original: DecryptedEntry;
    duplicates: DecryptedEntry[];
  }>;
  uniqueIds: Set<string>;
  totalDuplicates: number;
} {
  const duplicateGroups: Map<string, DecryptedEntry[]> = new Map();
  const processed = new Set<string>();
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    if (processed.has(entry.id)) continue;
    
    const group: DecryptedEntry[] = [entry];
    
    // Cherche les doublons
    for (let j = i + 1; j < entries.length; j++) {
      const other = entries[j];
      
      if (processed.has(other.id)) continue;
      
      if (isDuplicate(entry, other)) {
        group.push(other);
        processed.add(other.id);
      }
    }
    
    if (group.length > 1) {
      duplicateGroups.set(entry.id, group);
    }
    
    processed.add(entry.id);
  }
  
  // Format les résultats
  const duplicates = Array.from(duplicateGroups.entries()).map(([, group]) => ({
    original: group[0],
    duplicates: group.slice(1),
  }));
  
  const uniqueIds = new Set(entries.map(e => e.id));
  const totalDuplicates = duplicates.reduce((sum, g) => sum + g.duplicates.length, 0);
  
  return {
    duplicates,
    uniqueIds,
    totalDuplicates,
  };
}

/**
 * Vérifie si deux entrées sont des doublons
 */
function isDuplicate(entry1: DecryptedEntry, entry2: DecryptedEntry): boolean {
  // Même type requis
  if (entry1.type !== entry2.type) return false;
  
  // Même nom (case insensitive)
  const name1 = entry1.name.toLowerCase().trim();
  const name2 = entry2.name.toLowerCase().trim();
  
  if (name1 !== name2) return false;
  
  // Pour les mots de passe
  if (entry1.type === 'password') {
    const user1 = entry1.data.username?.toLowerCase().trim() || '';
    const user2 = entry2.data.username?.toLowerCase().trim() || '';
    const pass1 = entry1.data.password?.trim() || '';
    const pass2 = entry2.data.password?.trim() || '';
    
    // Même username OU même password
    return Boolean((user1 && user1 === user2) || (pass1 && pass1 === pass2));
  }
  
  // Pour les notes
  if (entry1.type === 'note') {
    const content1 = entry1.data.content?.trim() || '';
    const content2 = entry2.data.content?.trim() || '';
    
    return content1 === content2;
  }
  
  // Pour les clés privées
  if (entry1.type === 'privateKey') {
    const key1 = entry1.data.privateKey?.trim() || '';
    const key2 = entry2.data.privateKey?.trim() || '';
    
    return key1 === key2;
  }
  
  return false;
}

/**
 * Suggère quelle entrée garder (la plus récente ou la plus complète)
 */
export function suggestBestEntry(entries: DecryptedEntry[]): DecryptedEntry {
  if (entries.length === 0) throw new Error('Aucune entrée fournie');
  if (entries.length === 1) return entries[0];
  
  // Trie par date de mise à jour (plus récente en premier)
  const sorted = [...entries].sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  
  // Trouve l'entrée la plus complète
  let best = sorted[0];
  let bestScore = scoreEntry(best);
  
  for (const entry of sorted) {
    const score = scoreEntry(entry);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  
  return best;
}

/**
 * Score une entrée selon sa complétude
 */
function scoreEntry(entry: DecryptedEntry): number {
  let score = 0;
  
  // Points pour les champs remplis
  if (entry.name) score += 1;
  
  if (entry.type === 'password') {
    if (entry.data.username) score += 2;
    if (entry.data.password) score += 2;
  }
  
  if (entry.meta) {
    if (entry.meta.url) score += 1;
    if (entry.meta.category) score += 0.5;
  }
  
  // Points pour les tags
  if (entry.tags && entry.tags.length > 0) score += 1;
  
  // Points pour la date récente (favorise les entrées récentes)
  const daysSinceUpdate = (Date.now() - new Date(entry.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 7) score += 2;
  else if (daysSinceUpdate < 30) score += 1;
  
  return score;
}

/**
 * Génère un rapport de doublons en texte
 */
export function generateDuplicateReport(duplicates: ReturnType<typeof detectDuplicates>): string {
  const { duplicates: groups, totalDuplicates } = duplicates;
  
  if (groups.length === 0) {
    return '✅ Aucun doublon détecté !';
  }
  
  let report = `🔍 Rapport de Doublons\n\n`;
  report += `📊 ${totalDuplicates} doublon(s) détecté(s) dans ${groups.length} groupe(s)\n\n`;
  
  groups.forEach((group, index) => {
    report += `━━━ Groupe ${index + 1} ━━━\n`;
    report += `📝 Nom: ${group.original.name}\n`;
    report += `🔑 Type: ${group.original.type}\n`;
    report += `📅 Original: ${new Date(group.original.createdAt).toLocaleDateString('fr-FR')}\n`;
    report += `🔄 Doublons: ${group.duplicates.length}\n`;
    
    group.duplicates.forEach((dup, i) => {
      report += `  ${i + 1}. Créé le ${new Date(dup.createdAt).toLocaleDateString('fr-FR')}\n`;
    });
    
    report += `\n`;
  });
  
  return report;
}
