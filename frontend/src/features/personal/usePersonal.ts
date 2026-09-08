import { useState, useEffect, useCallback } from 'react';
import type { Personal } from './types';
import { getPersonal, createPersonal, updatePersonal, deletePersonal } from './personalApi';

export function usePersonal() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarPersonal = useCallback(() => {
    setLoading(true);
    getPersonal()
      .then((data) => {
        setPersonal(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarPersonal();
  }, [cargarPersonal]);

  const eliminar = async (dni: number) => {
    await deletePersonal(dni);
    setPersonal((prev) => prev.filter((p) => p.dni !== dni));
  };

  const guardar = async (datos: Personal, dniExistente?: number) => {
    if (dniExistente) {
      await updatePersonal(dniExistente, datos);
    } else {
      await createPersonal(datos);
    }
    cargarPersonal();
  };

  return { personal, loading, error, eliminar, guardar };
}