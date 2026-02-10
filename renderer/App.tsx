import { useState, useEffect } from 'react';
import CustomTitleBar from './components/CustomTitleBar';
import VaultDashboard from './components/VaultDashboard';
import VaultInit from './components/VaultInit';
import DiagnosticModal from './components/DiagnosticModal';
import { LicenseModal } from './components/LicenseModal';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { initializeTrial, canUseApp, getLicenseInfo } from './lib/licensing';
import './styles/VaultDashboard.css';
import './styles/LicenseModal.css';

export default function App() {
  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [canUse, setCanUse] = useState(true);
  const toast = useToast();

  useEffect(() => {
    // Initialiser le système de licence (première utilisation)
    initializeTrial();

    // Vérifier si l'app peut être utilisée
    const licenseInfo = getLicenseInfo();
    const isUsable = canUseApp();
    setCanUse(isUsable);

    // Afficher le modal de licence automatiquement si expiré
    if (licenseInfo.status === 'expired') {
      setShowLicenseModal(true);
    }

    // Vérifier si un coffre existe déjà
    const vaultSalt = localStorage.getItem('vault_salt');
    setHasVault(!!vaultSalt);
  }, []);

  const handleVaultCreated = (passphrase: string) => {
    // Le coffre a été créé, recharger l'app
    setHasVault(true);
  };

  const handleLicenseActivated = () => {
    setCanUse(true);
    setShowLicenseModal(false);
    
    // Afficher toast de confirmation
    toast.success(
      'Licence activée !',
      'Votre licence a été activée avec succès. Profitez de Cryptos Coffre sans limitation.',
      5000
    );
    
    // Notifier VaultDashboard pour rafraîchir le bandeau
    window.dispatchEvent(new CustomEvent('license-updated'));
  };

  // État de chargement
  if (hasVault === null) {
    return (
      <>
        <CustomTitleBar />
        <ToastContainer />
        <div className="vault-container vault-with-titlebar">
          <div className="vault-unlock-card">
            <h1 className="vault-title">⏳ Chargement...</h1>
          </div>
        </div>
      </>
    );
  }

  // Période d'essai expirée : bloquer l'accès
  if (!canUse) {
    return (
      <>
        <CustomTitleBar />
        <ToastContainer />
        <div className="vault-container vault-with-titlebar">
          <div className="vault-unlock-card">
            <h1 className="vault-title">⚠️ Période d'essai expirée</h1>
            <p className="license-expired-text">
              Votre période d'essai de 360 heures (15 jours) est terminée.<br />
              Activez une licence pour continuer à utiliser Cryptos Coffre.
            </p>
            {/* Bouton pour ouvrir le modal de licence
            <p className="license-expired-text">
              Votre période d'essai de 15 jours est terminée.<br />
              Activez une licence pour continuer à utiliser Cryptos Coffre.
            </p>
             */}
            <button
              className="btn-unlock"
              onClick={() => setShowLicenseModal(true)}
            >
              🔑 Activer une licence
            </button>
          </div>
        </div>
        {showLicenseModal && (
          <LicenseModal
            onClose={() => {}} // Ne pas permettre de fermer si expiré
            onActivated={handleLicenseActivated}
          />
        )}
      </>
    );
  }

  // Pas de coffre : afficher l'écran d'initialisation
  if (!hasVault) {
    return (
      <>
        <CustomTitleBar onShowLicense={() => setShowLicenseModal(true)} />
        <ToastContainer />
        <div className="vault-with-titlebar">
          <VaultInit onVaultCreated={handleVaultCreated} />
        </div>
        {showLicenseModal && (
          <LicenseModal
            onClose={() => setShowLicenseModal(false)}
            onActivated={handleLicenseActivated}
          />
        )}
      </>
    );
  }

  // Coffre existant : afficher le dashboard
  return (
    <>
      <CustomTitleBar onShowLicense={() => setShowLicenseModal(true)} />
      <ToastContainer />
      {showDiagnostic && <DiagnosticModal onClose={() => setShowDiagnostic(false)} />}
      
      {/* Bouton flottant pour ouvrir le diagnostic 
      <button
        onClick={() => setShowDiagnostic(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Ouvrir le diagnostic"
      >
        🔍
      </button>
      */}
      <div className="vault-with-titlebar">
        <VaultDashboard onUnlockChange={(unlocked) => {
          // Notifie CustomTitleBar de l'état de verrouillage
          window.dispatchEvent(new CustomEvent('vault-unlock-state', { detail: { unlocked } }));
        }} />
      </div>
      {showLicenseModal && (
        <LicenseModal
          onClose={() => setShowLicenseModal(false)}
          onActivated={handleLicenseActivated}
        />
      )}
    </>
  );
}
