/**
 * Composant pour gérer les doublons dans le coffre
 */

'use client';

import { useState } from 'react';
import { DecryptedEntry } from '../types/vault';
import { detectDuplicates, suggestBestEntry, generateDuplicateReport } from '../lib/duplicateDetector';
import '../styles/VaultDashboard.css';

interface DuplicateCleanerProps {
  entries: DecryptedEntry[];
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function DuplicateCleaner({ entries, onDelete, onClose }: DuplicateCleanerProps) {
  const [processing, setProcessing] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [selectedToKeep, setSelectedToKeep] = useState<Map<string, string>>(new Map());
  
  const duplicateResult = detectDuplicates(entries);
  const { duplicates, totalDuplicates } = duplicateResult;

  // Auto-sélectionne la meilleure entrée pour chaque groupe
  useState(() => {
    const initialSelection = new Map<string, string>();
    duplicates.forEach(group => {
      const best = suggestBestEntry([group.original, ...group.duplicates]);
      initialSelection.set(group.original.id, best.id);
    });
    setSelectedToKeep(initialSelection);
  });

  /**
   * Change la sélection pour un groupe
   */
  const handleSelectEntry = (groupId: string, entryId: string) => {
    setSelectedToKeep(prev => {
      const newMap = new Map(prev);
      newMap.set(groupId, entryId);
      return newMap;
    });
  };

  /**
   * Supprime tous les doublons sauf ceux sélectionnés
   */
  const handleCleanup = async () => {
    if (!window.confirm(
      `⚠️ Vous êtes sur le point de supprimer ${totalDuplicates} doublon(s).\n\n` +
      `Les entrées sélectionnées (✓) seront conservées.\n\n` +
      `Cette action est irréversible. Continuer ?`
    )) {
      return;
    }

    setProcessing(true);
    let deleted = 0;

    for (const group of duplicates) {
      const toKeep = selectedToKeep.get(group.original.id);
      const allEntries = [group.original, ...group.duplicates];
      
      for (const entry of allEntries) {
        if (entry.id !== toKeep) {
          try {
            await onDelete(entry.id);
            deleted++;
            setDeletedCount(deleted);
          } catch (err) {
            console.error('Erreur suppression:', err);
          }
        }
      }
    }

    setProcessing(false);
    alert(`✅ Nettoyage terminé !\n\n${deleted} doublon(s) supprimé(s)`);
    onClose();
  };

  if (duplicates.length === 0) {
    return (
      <div className="vault-modal-overlay" onClick={onClose}>
        <div className="vault-modal" onClick={e => e.stopPropagation()}>
          <h2>✅ Aucun Doublon</h2>
          <p>Votre coffre est propre, aucun doublon détecté !</p>
          <button onClick={onClose} className="vault-btn vault-btn-primary">
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vault-modal-overlay" onClick={onClose}>
      <div className="vault-modal vault-modal-large" onClick={e => e.stopPropagation()}>
        <h2>🔍 Nettoyage des Doublons</h2>
        <p className='duplicate-info-status'>
          <strong>{totalDuplicates} doublon(s)</strong> détecté(s) dans <strong>{duplicates.length} groupe(s)</strong>.
          Sélectionnez l&apos;entrée à conserver pour chaque groupe.
        </p>

        <button 
          onClick={() => alert(generateDuplicateReport(duplicateResult))}
          className="vault-btn vault-btn-secondary duplicate-report-button"
        >
          📊 Voir le Rapport Détaillé
        </button>

        <div className='duplicate-group-list'>
          {duplicates.map((group, index) => {
            const allEntries = [group.original, ...group.duplicates];
            const selected = selectedToKeep.get(group.original.id);

            return (
              <div key={group.original.id} className="duplicate-group">
                <div className="duplicate-group-header">
                  <h3>Groupe {index + 1}: {group.original.name}</h3>
                  <span className="duplicate-count">{allEntries.length} entrée(s)</span>
                </div>

                <div className="duplicate-entries">
                  {allEntries.map(entry => (
                    <div
                      key={entry.id}
                      className={`duplicate-entry ${selected === entry.id ? 'selected' : ''}`}
                      onClick={() => handleSelectEntry(group.original.id, entry.id)}
                    >
                      <div className="duplicate-entry-radio">
                        {selected === entry.id ? '✓' : '○'}
                      </div>
                      <div className="duplicate-entry-details">
                        <div><strong>Type:</strong> {entry.type}</div>
                        <div><strong>Créé:</strong> {new Date(entry.createdAt).toLocaleDateString('fr-FR')}</div>
                        <div><strong>Modifié:</strong> {new Date(entry.updatedAt).toLocaleDateString('fr-FR')}</div>
                        {entry.type === 'password' && (
                          <>
                            <div><strong>Username:</strong> {entry.data.username || 'N/A'}</div>
                            <div><strong>Password:</strong> {entry.data.password ? '••••••' : 'N/A'}</div>
                          </>
                        )}
                        {entry.meta?.url && <div><strong>URL:</strong> {entry.meta.url}</div>}
                        {entry.meta?.category && <div><strong>Catégorie:</strong> {entry.meta.category}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {processing && (
          <div className='delete-info-status'>
            ⏳ Suppression en cours... {deletedCount}/{totalDuplicates}
          </div>
        )}

        <div className='canceled-btn'>
          <button onClick={onClose} className="vault-btn vault-btn-secondary" disabled={processing}>
            Annuler
          </button>
          <button onClick={handleCleanup} className="vault-btn vault-btn-primary" disabled={processing}>
            {processing ? 'Nettoyage...' : `🗑️ Supprimer ${totalDuplicates} doublon(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
