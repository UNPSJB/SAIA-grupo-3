import { useState, useEffect, useCallback } from 'react';
import type { Insumo, InsumoCreate, InsumoUpdate } from './types';
import { getInsumos, createInsumo, updateInsumo, deleteInsumo } from './InsumoApi';

export function useInsumo() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarInsumos = useCallback(() => {
    setLoading(true);
    getInsumos()
      .then((data) => {
        setInsumos(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarInsumos();
  }, [cargarInsumos]);

  const eliminar = async (id: number) => {
    await deleteInsumo(id);
    setInsumos((prev) => prev.filter((i) => i.id !== id));
  };

  const guardar = async (datos: InsumoCreate | InsumoUpdate, idExistente?: number) => {
    if (idExistente) {
      await updateInsumo(idExistente, datos as InsumoUpdate);
    } else {
      await createInsumo(datos as InsumoCreate);
    }
    cargarInsumos();
  };

  return { insumos, loading, error, eliminar, guardar };
}