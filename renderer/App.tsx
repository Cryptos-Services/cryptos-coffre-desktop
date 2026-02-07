import { useState, useEffect } from 'react';
import CustomTitleBar from './components/CustomTitleBar';
import VaultDashboard from './components/VaultDashboard';
import VaultInit from './components/VaultInit';
import DiagnosticModal from './components/DiagnosticModal';
import { ToastContainer } from './components/Toast';
import './styles/VaultDashboard.css';

export default function App() {
  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  useEffect(() => {
    // Vérifier si un coffre existe déjà
    const vaultSalt = localStorage.getItem('vault_salt');
    setHasVault(!!vaultSalt);
  }, []);

  const handleVaultCreated = (passphrase: string) => {
    // Le coffre a été créé, recharger l'app
    setHasVault(true);
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

  // Pas de coffre : afficher l'écran d'initialisation
  if (!hasVault) {
    return (
      <>
        <CustomTitleBar />
        <ToastContainer />
        <div className="vault-with-titlebar">
          <VaultInit onVaultCreated={handleVaultCreated} />
        </div>
      </>
    );
  }

  // Coffre existant : afficher le dashboard
  return (
    <>
      <CustomTitleBar />
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
    </>
  );
}
