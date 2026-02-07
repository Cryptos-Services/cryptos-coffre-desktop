import React, { useEffect, useState } from 'react';
import { useToast } from '../hooks/useToast';
import type { Toast as ToastType } from '../types/toast';
import '../styles/Toast.css';

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    // Attend la fin de l'animation avant de supprimer
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  };

  // Icône par défaut selon le type
  const defaultIcons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const icon = toast.icon || defaultIcons[toast.type];

  return (
    <div
      className={`toast-item toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className="toast-icon">
        {icon}
      </div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        {toast.message && (
          <div className="toast-message">{toast.message}</div>
        )}
      </div>
      <button
        className="toast-close"
        onClick={handleDismiss}
        aria-label="Fermer la notification"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Conteneur de toasts - Utilise useToast() pour écouter le toastManager global
 * Pas besoin de passer les toasts en props, il les récupère automatiquement
 */
export function ToastContainer() {
  // console.log('🎨 ToastContainer: Rendu du composant');
  const toast = useToast();

  // console.log('📊 ToastContainer: Nombre de toasts à afficher:', toast.toasts.length);

  if (toast.toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toast.toasts.map(toastItem => (
        <ToastItem
          key={toastItem.id}
          toast={toastItem}
          onDismiss={toast.dismiss}
        />
      ))}
    </div>
  );
}
