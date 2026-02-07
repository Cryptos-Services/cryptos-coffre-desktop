/**
 * Types pour le système de toasts/notifications
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // Durée en ms (5000 par défaut)
  icon?: string; // Emoji personnalisé (optionnel)
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  icon?: string;
}
