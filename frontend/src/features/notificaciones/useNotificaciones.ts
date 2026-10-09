import { useState, useEffect, useCallback } from 'react';
import type { Notificacion } from './types';
import { getNotificaciones, getCantidadNoLeidas, marcarNotificacionLeida, marcarTodasLeidas } from './notificacionesApi';

// el tiempo de espera para recargar notificaciones
const INTERVALO_MS = 60_000;

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cantidadNoLeidas, setCantidadNoLeidas] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    Promise.all([getNotificaciones(), getCantidadNoLeidas()])
      .then(([lista, cantidad]) => {
        setNotificaciones(lista);
        setCantidadNoLeidas(cantidad);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    recargar();
    const intervalo = setInterval(recargar, INTERVALO_MS);
    return () => clearInterval(intervalo);
  }, [recargar]);

  const marcarLeida = async (id: number) => {
    await marcarNotificacionLeida(id);
    recargar();
  };

  const marcarTodas = async () => {
    await marcarTodasLeidas();
    recargar();
  };

  return { notificaciones, cantidadNoLeidas, error, recargar, marcarLeida, marcarTodas };
}
