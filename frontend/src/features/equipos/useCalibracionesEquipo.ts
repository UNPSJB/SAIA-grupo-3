import { useCallback, useEffect, useState } from 'react';
import {
  eliminarCalibracion,
  getCalibracionesEquipo,
  guardarCalibracion,
} from './calibracionApi';
import type { Calibracion, CalibracionInput } from './types';

export function useCalibracionesEquipo(equipoId: number) {
  const [calibraciones, setCalibraciones] = useState<Calibracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const datos = await getCalibracionesEquipo(equipoId);
      setCalibraciones(datos);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar las calibraciones.');
    } finally {
      setLoading(false);
    }
  }, [equipoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async (datos: CalibracionInput, idExistente?: number) => {
    await guardarCalibracion(equipoId, datos, idExistente);
    await cargar();
  };

  const eliminar = async (id: number) => {
    await eliminarCalibracion(id);
    await cargar();
  };

  return {
    calibraciones,
    loading,
    error,
    cargar,
    guardar,
    eliminar,
  };
}