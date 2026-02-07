/**
 * Gestionnaire global des toasts (évite les re-renders inutiles)
 */

import type { Toast } from '../types/toast';

type ToastListener = (toasts: Toast[]) => void;

class ToastManager {
  private toasts: Toast[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  add(toast: Omit<Toast, 'id'>) {
    const newToast: Toast = {
      ...toast,
      id: crypto.randomUUID(),
      duration: toast.duration ?? 5000,
    };

    // console.log('📥 Toast ajouté au manager:', newToast);
    this.toasts.push(newToast);
    // console.log('📋 Nombre de toasts:', this.toasts.length, 'Listeners:', this.listeners.size);
    this.notify();

    // Auto-dismiss
    const duration = newToast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        this.remove(newToast.id);
      }, duration);
    }

    return newToast.id;
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  clear() {
    this.toasts = [];
    this.notify();
  }

  getToasts() {
    return [...this.toasts];
  }
}

export const toastManager = new ToastManager();
