import { useState, useEffect, useCallback } from 'react';
import type { Equipo } from './types';
import { getEquipos, createEquipo, updateEquipo, deleteEquipo } from './equipoApi';

export function useEquipo() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarEquipos = useCallback(() => {
    setLoading(true);
    getEquipos()
      .then((data) => {
        setEquipos(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarEquipos();
  }, [cargarEquipos]);

  const eliminar = async (id: number) => {
    await deleteEquipo(id);
    setEquipos((prev) => prev.filter((e) => e.id !== id));
  };

  const guardar = async (datos: Equipo, idExistente?: number) => {
    if (idExistente) {
      await updateEquipo(idExistente, datos);
    } else {
      await createEquipo(datos);
    }
    cargarEquipos();
  };

  return { equipos, loading, error, eliminar, guardar };
}