import { useSyncExternalStore } from 'react';
import type { Tema } from '../libreria/tema';

function suscribirse(avisar: () => void) {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-bs-theme'],
  });
  return () => observador.disconnect();
}

function leerTemaActual(): Tema {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light';
}

/** Tema aplicado en este momento; se actualiza al cambiarlo desde el encabezado. */
export function useTema(): Tema {
  return useSyncExternalStore(suscribirse, leerTemaActual, () => 'light');
}
