import { useEffect, useRef } from 'react';

interface OpcionesRecarga {
  /** Eventos de window que indican que los datos cambiaron (ver libreria/eventos). */
  eventos?: string[];
  /** Cada cuánto recargar mientras la pestaña está visible (0 = nunca). */
  intervaloMs?: number;
}

/**
 * Mantiene una pantalla al día: recarga cuando otra parte del sistema avisa un
 * cambio, cuando el usuario vuelve a la pestaña y, opcionalmente, cada cierto tiempo
 * (para ver lo que cargan otros usuarios).
 */
export function useRecargaAutomatica(
  recargar: () => void,
  { eventos = [], intervaloMs = 0 }: OpcionesRecarga = {},
) {
  const recargarActual = useRef(recargar);
  useEffect(() => {
    recargarActual.current = recargar;
  });
  const clavesEventos = eventos.join('|');

  useEffect(() => {
    const alAvisar = () => recargarActual.current();
    const alVolver = () => {
      if (document.visibilityState === 'visible') recargarActual.current();
    };
    const nombres = clavesEventos ? clavesEventos.split('|') : [];
    nombres.forEach((nombre) => window.addEventListener(nombre, alAvisar));
    document.addEventListener('visibilitychange', alVolver);
    const temporizador =
      intervaloMs > 0
        ? window.setInterval(() => {
            if (document.visibilityState === 'visible') recargarActual.current();
          }, intervaloMs)
        : undefined;
    return () => {
      nombres.forEach((nombre) => window.removeEventListener(nombre, alAvisar));
      document.removeEventListener('visibilitychange', alVolver);
      if (temporizador !== undefined) window.clearInterval(temporizador);
    };
  }, [clavesEventos, intervaloMs]);
}
