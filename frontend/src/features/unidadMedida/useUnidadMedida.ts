import { useState, useEffect } from 'react';
import { getUnidadesMedida, createUnidadMedida, updateUnidadMedida, deleteUnidadMedida } from './unidadMedidaApi';
import type { UnidadMedida } from './types';

export const useUnidadMedida = () => {
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnidades = async () => {
    try {
      setLoading(true);
      const data = await getUnidadesMedida();
      setUnidades(data);
    } catch (err) {
      setError('Error al cargar las unidades de medida');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnidades();
  }, []);

  const guardar = async (unidad: { tipo: string; sufijo: string }, idExistente?: number) => {
    try {
      if (idExistente) {
        await updateUnidadMedida(idExistente, unidad);
      } else {
        await createUnidadMedida(unidad);
      }
      await fetchUnidades();
    } catch (err) {
      throw new Error('Error al guardar la unidad de medida');
    }
  };

  const eliminar = async (id: number) => {
    try {
      await deleteUnidadMedida(id);
      setUnidades((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      throw new Error('Error al eliminar la unidad de medida (esta siendo utilizado por un insumo)');
    }
  };

  return { unidades, loading, error, guardar, eliminar, refetch: fetchUnidades };
};