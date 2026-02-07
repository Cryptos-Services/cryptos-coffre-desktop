import React, { useState } from 'react';
import { saltToBase64 } from '../lib/encryption';

interface VaultInitProps {
  onVaultCreated: (passphrase: string) => void;
}

// Évaluation simple de la force de la passphrase
function evaluatePassphraseStrength(passphrase: string) {
  const length = passphrase.length;
  const hasLower = /[a-z]/.test(passphrase);
  const hasUpper = /[A-Z]/.test(passphrase);
  const hasDigit = /\d/.test(passphrase);
  const hasSpecial = /[^a-zA-Z0-9]/.test(passphrase);
  
  const varietyScore = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  
  if (length < 12) {
    return { label: 'Trop courte', className: 'short', feedback: 'Minimum 12 caractères' };
  }
  if (length >= 20 && varietyScore >= 3) {
    return { label: 'Excellente', className: 'excellent', feedback: 'Très sécurisée' };
  }
  if (length >= 16 && varietyScore >= 2) {
    return { label: 'Forte', className: 'good', feedback: 'Bonne sécurité' };
  }
  if (length >= 12) {
    return { label: 'Moyenne', className: 'medium', feedback: 'Acceptable mais améliorable' };
  }
  return { label: 'Faible', className: 'weak', feedback: 'Trop courte ou trop simple' };
}

// Génération de passphrase sécurisée
function generateSecurePassphrase(length: number = 24): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(byte => charset[byte % charset.length]).join('');
}

export default function VaultInit({ onVaultCreated }: VaultInitProps) {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGenerated, setShowGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const strength = passphrase ? evaluatePassphraseStrength(passphrase) : null;

  // Fonction de copie avec feedback
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur de copie:', err);
    }
  };
  const handleGeneratePassphrase = () => {
    const generated = generateSecurePassphrase(24);
    setPassphrase(generated);
    setConfirmPassphrase(generated);
    setShowGenerated(true);
    setIsGenerated(true);
  };

  // Si l'utilisateur modifie manuellement la passphrase, on cache le bouton Copier
  const handlePassphraseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassphrase(e.target.value);
    setIsGenerated(false);
  };
  const handleConfirmPassphraseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassphrase(e.target.value);
    setIsGenerated(false);
  };

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passphrase !== confirmPassphrase) {
      setError('❌ Les passphrases ne correspondent pas');
      return;
    }

    if (passphrase.length < 12) {
      setError('❌ La passphrase doit contenir au moins 12 caractères');
      return;
    }

    setLoading(true);

    try {
      // Cache le bouton Copier après création
      setShowGenerated(false);
      // Générer le salt (16 bytes aléatoires)
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      // Convertir le salt en base64 pour le stockage (compatible avec base64ToSalt)
      const saltBase64 = saltToBase64(salt);
      
      // Stocker le salt en base64
      localStorage.setItem('vault_salt', saltBase64);
      
      // Initialiser les données du coffre (vide au départ)
      localStorage.setItem('vault_data', JSON.stringify([]));
      
      alert('✅ Coffre créé avec succès !');
      
      // Notifier le parent que le coffre est créé
      onVaultCreated(passphrase);
    } catch (err) {
      setError('❌ Erreur lors de l\'initialisation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('⚠️ Réinitialiser complètement le coffre ?\n\nToutes les données seront DÉFINITIVEMENT supprimées.\n\nCette action est IRRÉVERSIBLE !')) {
      if (confirm('❗ DERNIÈRE CONFIRMATION\n\nÊtes-vous absolument sûr(e) de vouloir supprimer toutes les données ?')) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  return (
    <div className="vault-container">
      <div className="vault-unlock-card-created">
        <h1 className="vault-title">🔐 Créer votre Coffre Numérique</h1>
        
        <p className="vault-subtitle">
          Bienvenue ! Choisissez une passphrase maître forte pour protéger vos données.
        </p>

        <form onSubmit={handleInit} className="vault-unlock-form">
          <input
            type="password"
            value={passphrase}
            onChange={handlePassphraseChange}
            placeholder="Passphrase maître (min. 12 caractères)"
            className="vault-input-unlock"
            required
            autoFocus
          />
          
          {strength && (
            <div className={`vault-passphrase-strength ${strength.className}`}>
              Force : <strong>{strength.label}</strong> - {strength.feedback}
            </div>
          )}

          <input
            type="password"
            value={confirmPassphrase}
            onChange={handleConfirmPassphraseChange}
            placeholder="Confirmer la passphrase"
            className="vault-input-unlock"
            required
          />
          <div className='vault-generate-group'>
            <button
              type="button"
              onClick={handleGeneratePassphrase}
              className="vault-btn vault-btn-generate"
            >
              🎲 Générer une passphrase sécurisée
            </button>
            {showGenerated && isGenerated && (
              <button
                type="button"
                onClick={() => copyToClipboard(passphrase)}
                className="vault-btn vault-btn-generate"
                title={copied ? 'Copié !' : 'Copier'}
              >
                {copied ? '✓ Copié' : '📋 Copier'}
              </button>
            )}
          </div>

          {showGenerated && (
            <div className='vault-show-generated-passphrase'>
              <strong>⚠️ IMPORTANT :</strong> Copiez cette passphrase dans un endroit sûr !
              <br />
              <small>Vous ne pourrez jamais la récupérer si vous la perdez.</small>
            </div>
          )}

          <button
            type="submit"
            className="vault-btn vault-btn-primary"
            disabled={loading}
          >
            {loading ? '⏳ Création...' : '🚀 Créer mon coffre'}
          </button>
        </form>

        {error && (
          <div className='vault-error-message'>
            {error}
          </div>
        )}


        {/*}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            onClick={handleReset}
            className="vault-btn vault-btn-danger"
            style={{
              background: '#dc2626',
              fontSize: '13px',
              padding: '8px 16px'
            }}
          >
            🔧 Réinitialiser le localStorage
          </button>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
            Utiliser uniquement pour dépannage
          </p>
        </div>
        */}
      </div>
    </div>
  );
}
