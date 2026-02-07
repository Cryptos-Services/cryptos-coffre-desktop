'use client';

/**
 * Composant pour gérer TOTP 2FA (Google/Microsoft Authenticator)
 */

// Image component removed (not needed in Electron)
import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import logoImage from '../assets/Cryptos-Coffre-Logo.png';
import { useSecuritySettings } from '../hooks/useSecuritySettings';
import {
  generateTOTPSecret,
  generateTOTPUri,
  verifyTOTPCode,
  getCurrentTOTPCode,
  getTOTPTimeRemaining,
  formatTOTPCode,
} from '../lib/totp';
import { addAuditLog } from '../lib/auditLog';
import '../styles/SecuritySettings.css';

export default function TOTPManager() {
  const { settings, saveSettings } = useSecuritySettings();
  const [setupMode, setSetupMode] = useState(false);
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Met à jour le code actuel et le temps restant (pour démonstration)
  useEffect(() => {
    if (secret && setupMode) {
      const updateCode = async () => {
        const code = await getCurrentTOTPCode(secret);
        setCurrentCode(code);
        setTimeRemaining(getTOTPTimeRemaining());
      };

      updateCode();
      const interval = setInterval(updateCode, 1000);
      return () => clearInterval(interval);
    }
  }, [secret, setupMode]);

  // Fonction pour générer le QR code personnalisé
  const generateCustomQRCode = async (uri: string) => {
    if (!qrCanvasRef.current) return;
    
    const canvas = qrCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Générer le QR code avec couleurs personnalisées
    await QRCode.toCanvas(canvas, uri, {
      width: 280,
      margin: 2,
      color: {
        dark: '#030121',  // Couleur des modules du QR code
        light: '#FFFFFF'  // Couleur de fond
      },
      errorCorrectionLevel: 'H' // Niveau élevé pour supporter le logo au centre
    });

    // Charger et dessiner le logo au centre
    const logo = new Image();
    logo.crossOrigin = 'anonymous'; // Pour éviter les problèmes CORS
    logo.onload = () => {
      const logoSize = 60; // Taille du logo
      const x = (canvas.width - logoSize) / 2;
      const y = (canvas.height - logoSize) / 2;

      // Dessiner un fond jaune sous le logo pour meilleure lisibilité
      ctx.fillStyle = '#f0f0f0'; // Couleur de fond du logo (jaune)
      ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);

      // Dessiner le logo
      ctx.drawImage(logo, x, y, logoSize, logoSize);
    };
    logo.onerror = (err) => {
      console.error('❌ Erreur chargement logo:', err);
      // console.log('📍 Chemin logo tenté:', logoImage);
    };
    logo.src = logoImage; // Utilise l'import Vite
  };

  // Démarrer la configuration TOTP
  const handleStartSetup = () => {
    const newSecret = generateTOTPSecret();
    setSecret(newSecret);
    
    const uri = generateTOTPUri(newSecret, 'Vault User', 'Cryptos Coffre');
    
    // Générer le QR code customisé
    setTimeout(() => generateCustomQRCode(uri), 100);
    
    setSetupMode(true);
    setError(null);
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    try {
      const isValid = await verifyTOTPCode(secret, verificationCode);
      
      if (isValid) {
        saveSettings({
          totpEnabled: true,
          totpSecret: secret,
        });

        addAuditLog('2fa_enabled', {
          success: true,
        });

        setSetupMode(false);
        setSecret('');
        setQrCodeUrl('');
        setVerificationCode('');
        alert('✅ TOTP 2FA activé avec succès !');
      } else {
        setError('Code invalide. Vérifiez le code affiché dans votre application.');
        
        addAuditLog('2fa_enabled', {
          success: false,
          errorMessage: 'Code TOTP invalide',
        });
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Erreur lors de la vérification');
    }
  };

  const handleDisable = () => {
    if (!confirm('⚠️ Désactiver TOTP 2FA ? Vous devrez reconfigurer votre application.')) {
      return;
    }

    saveSettings({
      totpEnabled: false,
      totpSecret: undefined,
    });

    addAuditLog('2fa_disabled', {
      success: true,
    });

    alert('✅ TOTP 2FA désactivé');
  };

  const handleCancelSetup = () => {
    setSetupMode(false);
    setSecret('');
    setQrCodeUrl('');
    setVerificationCode('');
    setError(null);
  };

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

  return (
    <div className="security-settings-section">
      <h3>📱 TOTP 2FA (Authenticator Apps)</h3>

      <div className="security-setting-item">
        <p className="security-setting-description">
          Utilisez une application d&apos;authentification comme Google Authenticator, 
          Microsoft Authenticator, Authy ou 1Password pour générer des codes à 6 chiffres.
        </p>
      </div>

      {!setupMode && !settings.totpEnabled && (
        <div className="security-setting-item">
          <button
            onClick={handleStartSetup}
            className="vault-btn vault-btn-primary"
          >
            🔐 Configurer TOTP 2FA
          </button>
        </div>
      )}

      {setupMode && (
        <div className="totp-step-container">
          <div className="security-setting-item">
            <h4>Étape 1 : Scannez le QR Code</h4>
            <p className="security-setting-description">
              Ouvrez votre application d&apos;authentification et scannez ce code :
            </p>
            <div className="totp-qr-container">
              <canvas
                ref={qrCanvasRef}
                width={280}
                height={280}
                className="totp-qr-code"
                onClick={() => copyToClipboard(secret)}
                title="Cliquez pour copier le code secret"
              />
            </div>
          </div>

          <div className="totp-step-container">
            <h4>Code secret (manuel)</h4>
            <p className="security-setting-description">
              Si vous ne pouvez pas scanner, entrez ce code manuellement :
            </p>
            <div className="totp-secret-display">
              <code>{secret}</code>
              <button
                onClick={() => copyToClipboard(secret)}
                className="vault-btn vault-btn-secondary"
                title={copied ? 'Copié !' : 'Copier'}                
              >
                {copied ? '✓' : '📋 Copier'}
              </button>
            </div>
          </div>

          {/* Affiche le code actuel pour test (à retirer en production)
          {currentCode && (
            <div className="totp-step-container">
              <h4>Code actuel (pour test)</h4>
              <div className="totp-current-code">
                <span className="totp-code-display">{formatTOTPCode(currentCode)}</span>
                <span className="totp-time-remaining">
                  Expire dans {timeRemaining}s
                </span>
              </div>
            </div>
          )}
             */}

          <div className="totp-step-container">
            <h4>Étape 2 : Vérifiez le code</h4>
            <p className="security-setting-description">
              Entrez le code à 6 chiffres affiché dans votre application :
            </p>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
                setError(null);
              }}
              placeholder="123456"
              className="totp-code-input"
              maxLength={6}
              autoComplete="off"
            />
            {error && (
              <p className="security-error-message">{error}</p>
            )}
          </div>

          <div className="security-setting-item">
            <div className="security-button-group">
              <button
                onClick={handleVerifyAndEnable}
                disabled={verificationCode.length !== 6}
                className="vault-btn vault-btn-primary"
              >
                ✅ Vérifier et activer
              </button>
              <button
                onClick={handleCancelSetup}
                className="vault-btn vault-btn-secondary"
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {settings.totpEnabled && !setupMode && (
        <div className="security-setting-item">
          <div className="security-stats-grid">
            <div className="security-stat-card">
              <div className="security-stat-value security-stat-success">✓</div>
              <div className="security-stat-label">TOTP Activé</div>
            </div>
          </div>

          <div className="security-button-group">
            <button
              onClick={handleDisable}
              className="vault-btn vault-btn-danger"
            >
              🔓 Désactiver TOTP 2FA
            </button>
          </div>
        </div>
      )}

      <div className="security-info-box">
        <p>
          <strong>ℹ️ Applications compatibles:</strong>
        </p>
        <ul className="security-info-list">
          <li>Google Authenticator (Android, iOS)</li>
          <li>Microsoft Authenticator (Android, iOS)</li>
          <li>Authy (Android, iOS, Desktop)</li>
          <li>1Password, Bitwarden, LastPass</li>
        </ul>
      </div>
    </div>
  );
}


