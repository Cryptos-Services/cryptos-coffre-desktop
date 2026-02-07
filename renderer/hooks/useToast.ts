import { useState, useEffect } from 'react';
import { toastManager } from '../lib/toastManager';
import type { Toast, ToastType, ToastOptions } from '../types/toast';

/**
 * Hook pour utiliser le système de toasts
 * 
 * @example
 * const toast = useToast();
 * toast.success('Action réussie !', 'Votre modification a été enregistrée');
 * toast.error('Erreur', 'Une erreur est survenue');
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    console.log('🔌 useToast: Initialisation et subscription...');
    setToasts(toastManager.getToasts());
    const unsubscribe = toastManager.subscribe((newToasts) => {
      console.log('🔔 useToast: Notification reçue, nouveaux toasts:', newToasts.length);
      setToasts(newToasts);
    });
    return () => {
      console.log('🔌 useToast: Nettoyage subscription');
      unsubscribe();
    };
  }, []);

  return {
    toasts,
    
    /**
     * Affiche un toast de succès
     */
    success: (title: string, message?: string, duration?: number) => {
      return toastManager.add({
        type: 'success',
        title,
        message,
        duration,
        icon: '✅',
      });
    },

    /**
     * Affiche un toast d'erreur
     */
    error: (title: string, message?: string, duration?: number) => {
      return toastManager.add({
        type: 'error',
        title,
        message,
        duration,
        icon: '❌',
      });
    },

    /**
     * Affiche un toast d'avertissement
     */
    warning: (title: string, message?: string, duration?: number) => {
      return toastManager.add({
        type: 'warning',
        title,
        message,
        duration,
        icon: '⚠️',
      });
    },

    /**
     * Affiche un toast d'information
     */
    info: (title: string, message?: string, duration?: number) => {
      return toastManager.add({
        type: 'info',
        title,
        message,
        duration,
        icon: 'ℹ️',
      });
    },

    /**
     * Affiche un toast personnalisé
     */
    show: (type: ToastType, title: string, message?: string, options?: ToastOptions) => {
      return toastManager.add({
        type,
        title,
        message,
        duration: options?.duration,
        icon: options?.icon,
      });
    },

    /**
     * Ferme un toast spécifique
     */
    dismiss: (id: string) => {
      toastManager.remove(id);
    },

    /**
     * Ferme tous les toasts
     */
    dismissAll: () => {
      toastManager.clear();
    },
  };
}
