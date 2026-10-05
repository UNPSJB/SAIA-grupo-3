import { useCallback, useEffect, useState } from 'react';

import type { Checklist } from './types';
import {
  finalizarTareaApi,
  getChecklistDelDia,
  type ConsumoTareaInput,
} from './checklistApi';

export function useChecklist(personalId: number) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarChecklist = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const data = await getChecklistDelDia(personalId);
      setChecklist(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo obtener el checklist.',
      );
    } finally {
      setLoading(false);
    }
  }, [personalId]);

  useEffect(() => {
    void cargarChecklist();
  }, [cargarChecklist]);

  const finalizarTarea = async (
    itemId: number,
    imagen: File | null,
    consumos: ConsumoTareaInput[],
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await finalizarTareaApi(itemId, imagen, consumos);
      await cargarChecklist();
      return true;
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo finalizar la tarea.',
      );
      setLoading(false);
      return false;
    }
  };

  return {
    checklist,
    loading,
    error,
    recargar: cargarChecklist,
    finalizarTarea,
  };
}