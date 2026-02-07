import React, { useState, useEffect } from 'react';
import '../styles/DiagnosticModal.css';

export default function DiagnosticModal({ onClose }: { onClose: () => void }) {
  const [diagnostics, setDiagnostics] = useState<any>({});

  useEffect(() => {
    const vaultSalt = localStorage.getItem('vault_salt');
    const vaultData = localStorage.getItem('vault_data');
    
    setDiagnostics({
      hasSalt: !!vaultSalt,
      saltLength: vaultSalt?.length || 0,
      saltPreview: vaultSalt?.substring(0, 20) || 'N/A',
      hasData: !!vaultData,
      dataPreview: vaultData?.substring(0, 50) || 'N/A',
      allKeys: Object.keys(localStorage),
      localStorage: {
        vault_salt: vaultSalt,
        vault_data: vaultData
      }
    });
  }, []);

  const handleClearAll = () => {
    if (confirm('⚠️ Supprimer TOUT le localStorage ?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>🔍 Diagnostic localStorage</h2>
        
        <div className="diagnostic-section">
          <strong>Salt stocké :</strong> {diagnostics.hasSalt ? '✅ OUI' : '❌ NON'}
          <br />
          <strong>Longueur salt :</strong> {diagnostics.saltLength} caractères
          <br />
          <strong>Aperçu salt :</strong> <code>{diagnostics.saltPreview}</code>
        </div>

        <div className="diagnostic-section">
          <strong>Données stockées :</strong> {diagnostics.hasData ? '✅ OUI' : '❌ NON'}
          <br />
          <strong>Aperçu données :</strong> <code>{diagnostics.dataPreview}</code>
        </div>

        <div className="diagnostic-section-keys">
          <strong>Toutes les clés localStorage :</strong>
          <br />
          {diagnostics.allKeys?.map((key: string) => (
            <div key={key} className="diagnostic-key-item">
              • <code>{key}</code>
            </div>
          ))}
        </div>

        <details className='diagnostic-section-contents'>
          <summary>🔴 Contenu complet (cliquez pour afficher)</summary>
          <pre>
            {JSON.stringify(diagnostics.localStorage, null, 2)}
          </pre>
        </details>

        <div className='diagnostic-modal-buttons'>
          <button
            onClick={onClose}
            className='diagnostic-modal-buttons close-button'
          >
            Fermer
          </button>
          <button
            onClick={handleClearAll}
            className='diagnostic-modal-buttons clear-button'
          >
            🗑️ Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}
