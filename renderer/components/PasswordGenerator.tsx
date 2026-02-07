'use client';

import React, { useState, useCallback } from 'react';
import '../styles/PasswordGenerator.css';

interface PasswordGeneratorProps {
  onPasswordGenerated?: (password: string) => void;
  embedded?: boolean; // Si true, affichage compact pour intégration dans formulaires
}

export default function PasswordGenerator({ onPasswordGenerated, embedded = false }: PasswordGeneratorProps) {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [copied, setCopied] = useState(false);

  const calculateStrength = (pwd: string): { score: number; label: string; className: string } => {
    let score = 0;
    
    // Longueur
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;
    if (pwd.length >= 20) score += 1;
    
    // Variété des caractères
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;
    
    if (score <= 3) return { score: 1, label: 'Faible', className: 'very-weak' };
    if (score <= 5) return { score: 2, label: 'Moyen', className: 'weak' };
    if (score <= 7) return { score: 3, label: 'Bon', className: 'strong' };
    return { score: 4, label: 'Excellent', className: 'very-strong' };
  };

  const generatePassword = useCallback(() => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let charset = '';
    let requiredChars = '';
    
    if (includeUppercase) {
      charset += uppercase;
      requiredChars += uppercase[Math.floor(Math.random() * uppercase.length)];
    }
    if (includeLowercase) {
      charset += lowercase;
      requiredChars += lowercase[Math.floor(Math.random() * lowercase.length)];
    }
    if (includeNumbers) {
      charset += numbers;
      requiredChars += numbers[Math.floor(Math.random() * numbers.length)];
    }
    if (includeSymbols) {
      charset += symbols;
      requiredChars += symbols[Math.floor(Math.random() * symbols.length)];
    }
    
    if (charset === '') {
      alert('Veuillez sélectionner au moins un type de caractère');
      return;
    }
    
    // Générer le reste du mot de passe
    let generatedPassword = requiredChars;
    const remainingLength = length - requiredChars.length;
    
    for (let i = 0; i < remainingLength; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      generatedPassword += charset[randomIndex];
    }
    
    // Mélanger le mot de passe
    generatedPassword = generatedPassword
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
    
    setPassword(generatedPassword);
    if (onPasswordGenerated) {
      onPasswordGenerated(generatedPassword);
    }
    setCopied(false);
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols, onPasswordGenerated]);

  const copyToClipboard = async () => {
    if (!password) return;
    
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Erreur lors de la copie');
    }
  };

  const strength = password ? calculateStrength(password) : null;

  if (embedded) {
    return (
      <div className="password-generator-embedded">
        <div className="generator-controls-compact">
          <div className="length-control-compact">
            <label htmlFor="password-length-compact">Longueur: {length}</label>
            <input
              id="password-length-compact"
              type="range"
              min="8"
              max="64"
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              aria-label="Longueur du mot de passe"
            />
          </div>
          <div className="options-compact">
            <label>
              <input
                type="checkbox"
                checked={includeUppercase}
                onChange={(e) => setIncludeUppercase(e.target.checked)}
              />
              A-Z
            </label>
            <label>
              <input
                type="checkbox"
                checked={includeLowercase}
                onChange={(e) => setIncludeLowercase(e.target.checked)}
              />
              a-z
            </label>
            <label>
              <input
                type="checkbox"
                checked={includeNumbers}
                onChange={(e) => setIncludeNumbers(e.target.checked)}
              />
              0-9
            </label>
            <label>
              <input
                type="checkbox"
                checked={includeSymbols}
                onChange={(e) => setIncludeSymbols(e.target.checked)}
              />
              !@#
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={generatePassword}
          className="generate-button-compact"
        >
          🎲 Générer
        </button>
      </div>
    );
  }

  return (
    <div className="password-generator">
      <div className="generator-header">
        <h2>🎲 Générateur de Mots de Passe</h2>
      </div>


      <div className="password-display">
        <div className="password-output">
          {password || 'Cliquez sur "Générer" pour créer un mot de passe'}
        </div>
        {password && (
          <button
            onClick={copyToClipboard}
            className="copy-button"
            title={copied ? 'Copié !' : 'Copier'}
          >
            {copied ? '✓' : '📋'}
          </button>
        )}
      </div>

      {strength && (
        <div className="strength-indicator">
          <div className="strength-label">Force: {strength.label}</div>
          <div className="strength-bar">
            <div className={`strength-fill ${strength.className}`} />
          </div>
        </div>
      )}

      <div className="generator-controls">
        <div className="length-control">
          <label htmlFor="password-length-full">
            Longueur: <strong>{length}</strong> caractères
          </label>
          <input
            id="password-length-full"
            type="range"
            min="8"
            max="64"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="length-slider"
            aria-label="Longueur du mot de passe"
          />
        </div>

        <div className="options-grid">
          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={includeUppercase}
              onChange={(e) => setIncludeUppercase(e.target.checked)}
            />
            <span>Majuscules (A-Z)</span>
          </label>
          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={includeLowercase}
              onChange={(e) => setIncludeLowercase(e.target.checked)}
            />
            <span>Minuscules (a-z)</span>
          </label>
          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={includeNumbers}
              onChange={(e) => setIncludeNumbers(e.target.checked)}
            />
            <span>Chiffres (0-9)</span>
          </label>
          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={includeSymbols}
              onChange={(e) => setIncludeSymbols(e.target.checked)}
            />
            <span>Symboles (!@#$%...)</span>
          </label>
        </div>
      </div>

      <button onClick={generatePassword} className="generate-button">
        🎲 Générer un Mot de Passe
      </button>

      {copied && <div className="copy-notification">✓ Copié dans le presse-papier</div>}
    </div>
  );
}
