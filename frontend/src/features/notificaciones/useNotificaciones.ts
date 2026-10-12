import { useState, useEffect, useCallback, useRef } from 'react';
import { NOTIFICACIONES_ACTUALIZADAS } from './events';
import type { Notificacion } from './types';
import { getNotificaciones, getCantidadNoLeidas, marcarNotificacionLeida, marcarTodasLeidas } from './notificacionesApi';

// el tiempo de espera para recargar notificaciones
const INTERVALO_MS = 60_000;

export function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cantidadNoLeidas, setCantidadNoLeidas] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ultimaSolicitud = useRef(0);

  const recargar = useCallback(() => {
    const solicitud = ++ultimaSolicitud.current;
    Promise.all([getNotificaciones(), getCantidadNoLeidas()])
      .then(([lista, cantidad]) => {
        if (solicitud !== ultimaSolicitud.current) return;
        setNotificaciones(lista);
        setCantidadNoLeidas(cantidad);
        setError(null);
      })
      .catch((err: Error) => {
        if (solicitud === ultimaSolicitud.current) setError(err.message);
      });
  }, []);

  useEffect(() => {
    recargar();
    const intervalo = setInterval(recargar, INTERVALO_MS);
    window.addEventListener(NOTIFICACIONES_ACTUALIZADAS, recargar);
    const invalidarSolicitudes = () => { ultimaSolicitud.current++; };
    return () => {
      invalidarSolicitudes();
      clearInterval(intervalo);
      window.removeEventListener(NOTIFICACIONES_ACTUALIZADAS, recargar);
    };
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
