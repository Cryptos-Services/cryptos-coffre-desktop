import { useEffect, useRef } from 'react';

/**
 * Hook pour forcer le focus automatique sur un input dans Electron
 * 
 * Problème : Dans Electron, autoFocus ne fonctionne pas de manière fiable car :
 * - La fenêtre peut ne pas avoir le focus système
 * - Les composants React sont montés avant que la fenêtre soit focusée
 * - contextIsolation peut bloquer certains comportements natifs
 * 
 * Solution : Force le focus avec setTimeout après le montage complet
 * 
 * Usage :
 * ```tsx
 * const inputRef = useAutoFocus<HTMLInputElement>();
 * return <input ref={inputRef} type="text" />;
 * ```
 * 
 * @param dependencies - Dépendances optionnelles pour re-déclencher le focus
 * @param delay - Délai en ms avant le focus (défaut: 100ms)
 * @returns Ref à attacher à l'élément input
 */
export function useAutoFocus<T extends HTMLElement = HTMLInputElement>(
  dependencies: unknown[] = [],
  delay: number = 100
) {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    // Timeout pour s'assurer que le DOM est complètement rendu
    const timeoutId = setTimeout(() => {
      if (elementRef.current) {
        try {
          elementRef.current.focus();
          
          // Si c'est un input de type text/password, sélectionne le contenu
          if (
            elementRef.current instanceof HTMLInputElement &&
            (elementRef.current.type === 'text' || elementRef.current.type === 'password')
          ) {
            elementRef.current.select();
          }
        } catch (error) {
          console.warn('⚠️ useAutoFocus: Impossible de définir le focus', error);
        }
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return elementRef;
}

/**
 * Variante avancée : Force le focus avec plusieurs tentatives
 * Utile pour les cas où le focus est perdu à cause d'animations ou de transitions
 * 
 * @param maxAttempts - Nombre maximum de tentatives (défaut: 3)
 * @param interval - Intervalle entre les tentatives en ms (défaut: 100ms)
 */
export function usePersistentAutoFocus<T extends HTMLElement = HTMLInputElement>(
  dependencies: unknown[] = [],
  maxAttempts: number = 3,
  interval: number = 100
) {
  const elementRef = useRef<T>(null);
  const hasFocusedOnce = useRef(false);

  useEffect(() => {
    // Reset le flag quand les dépendances changent
    hasFocusedOnce.current = false;
    
    let attempts = 0;
    const intervalId = setInterval(() => {
      attempts++;
      
      // Si l'élément existe et n'a pas le focus
      if (elementRef.current && document.activeElement !== elementRef.current) {
        try {
          elementRef.current.focus();
          
          // Sélectionne le texte SEULEMENT la première fois que le focus est acquis
          // Cela évite d'interférer avec les interactions de l'utilisateur
          if (
            !hasFocusedOnce.current &&
            elementRef.current instanceof HTMLInputElement &&
            (elementRef.current.type === 'text' || elementRef.current.type === 'password')
          ) {
            elementRef.current.select();
            hasFocusedOnce.current = true;
          }
        } catch (error) {
          console.warn('⚠️ usePersistentAutoFocus: Impossible de définir le focus', error);
        }
      }
      
      // Arrête après maxAttempts ou si le focus est acquis
      if (attempts >= maxAttempts || document.activeElement === elementRef.current) {
        clearInterval(intervalId);
        if (document.activeElement === elementRef.current) {
          hasFocusedOnce.current = true;
        }
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return elementRef;
}
