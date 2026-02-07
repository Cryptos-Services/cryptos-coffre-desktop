'use client';

/**
 * Gestionnaire de l'indice de passphrase
 * Permet de définir/modifier un indice pour aider à se souvenir de la passphrase
 */

import { useState } from 'react';
import '../styles/SecuritySettings.css';

export default function PassphraseHintManager() {
  // Initialisation lazy pour éviter les setState dans useEffect
  const [hint, setHint] = useState(() => localStorage.getItem('passphrase-hint') || '');
  const [editMode, setEditMode] = useState(false);
  const [newHint, setNewHint] = useState(() => localStorage.getItem('passphrase-hint') || '');

  /**
   * Sauvegarde l'indice
   */
  const handleSave = () => {
    const trimmed = newHint.trim();
    
    if (trimmed === '') {
      if (!confirm('⚠️ Voulez-vous vraiment supprimer l\'indice de passphrase ?')) {
        return;
      }
      localStorage.removeItem('passphrase-hint');
      setHint('');
      setNewHint('');
      setEditMode(false);
      alert('✅ Indice supprimé');
      return;
    }
    
    // Vérifications de sécurité
    if (trimmed.length < 5) {
      alert('❌ L\'indice doit contenir au moins 5 caractères');
      return;
    }
    
    if (trimmed.length > 200) {
      alert('❌ L\'indice ne peut pas dépasser 200 caractères');
      return;
    }
    
    localStorage.setItem('passphrase-hint', trimmed);
    setHint(trimmed);
    setEditMode(false);
    alert('✅ Indice de passphrase sauvegardé');
  };

  /**
   * Annule l'édition
   */
  const handleCancel = () => {
    setNewHint(hint);
    setEditMode(false);
  };

  return (
    <div className="security-settings-section">
      <h3>💡 Indice de Passphrase</h3>
      
      <p className="security-setting-description">
        Un indice peut vous aider à vous souvenir de votre passphrase en cas d&apos;oubli.
      </p>

      {/* Avertissement de sécurité */}
      <div className="security-warning-box">
        <h4>
          ⚠️ Règles de Sécurité Importantes
        </h4>
        <ul className="hint-warning-box-content">
          <li>Ne révélez JAMAIS directement votre passphrase</li>
          <li>L&apos;indice doit être personnel et compréhensible uniquement par vous</li>
          <li>Évitez les indices trop évidents</li>
          <li>Exemples :
            <ul className="hint-warning-box-content">
              <li>❌ Mauvais : &quot;Nom de mon chat&quot; (trop direct)</li>
              <li>✅ Bon : &quot;Phrase du film que j&apos;ai vu à Noël 2020&quot; (personnel)</li>
            </ul>
          </li>
        </ul>
      </div>

      {/* Affichage de l'indice actuel */}
      {!editMode && (
        <>
          {hint ? (
            <div className="hint-display-box">
              <div className="hint-display-flex">
                <span className="hint-emoji">💡</span>
                <div className="hint-content">
                  <strong className="hint-title">
                    Indice actuel :
                  </strong>
                  <p className="hint-text">
                    {hint}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="hint-empty-box">
              <p className="hint-empty-text">
                ℹ️ Aucun indice configuré. Cliquez sur &quot;Modifier l&apos;indice&quot; pour en ajouter un.
              </p>
            </div>
          )}

          <button
            onClick={() => setEditMode(true)}
            className="vault-btn vault-btn-primary hint-button-margin"
          >
            {hint ? '✏️ Modifier l\'indice' : '➕ Ajouter un indice'}
          </button>
        </>
      )}

      {/* Formulaire d'édition */}
      {editMode && (
        <div className="security-setting-item hint-button-margin">
          <label htmlFor="hint-input" className="vault-label">
            <strong>Nouvel indice de passphrase</strong>
          </label>
          <textarea
            id="hint-input"
            value={newHint}
            onChange={(e) => setNewHint(e.target.value)}
            placeholder="Exemple: La phrase de mon film préféré que j'ai vu à Paris en 2020"
            className="vault-input hint-textarea"
            rows={3}
            maxLength={200}
          />
          <div className="hint-char-counter">
            <span className="hint-char-count">
              {newHint.length} / 200 caractères
            </span>
            {newHint.trim() !== '' && newHint.trim().length < 5 && (
              <span className="hint-char-warning">
                ⚠️ Minimum 5 caractères
              </span>
            )}
          </div>

          <div className="hint-button-group">
            <button
              onClick={handleSave}
              className="vault-btn vault-btn-primary"
            >
              ✅ Enregistrer
            </button>
            <button
              onClick={handleCancel}
              className="vault-btn vault-btn-secondary"
            >
              ❌ Annuler
            </button>
          </div>
        </div>
      )}

      {/* Informations complémentaires */}
      <div className="security-info-box hint-info-margin">
        <p className="hint-info-content">
          <strong>ℹ️ À savoir :</strong>
        </p>
        <ul className="security-info-list">
          <li>L&apos;indice est stocké localement sur cet appareil</li>
          <li>Il sera affiché sur l&apos;écran de déverrouillage si vous avez un doute</li>
          <li>L&apos;indice ne remplace PAS les codes de récupération</li>
          <li>En cas d&apos;oubli total, seuls les codes de récupération peuvent vous aider</li>
        </ul>
      </div>
    </div>
  );
}
