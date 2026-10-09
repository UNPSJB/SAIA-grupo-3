import { useCallback, useEffect, useState, useRef } from 'react';

import type { Checklist } from './types';
import { finalizarTareaApi, getChecklistDelDia, type ConsumoTareaInput } from './checklistApi';

export function useChecklist(personalId: number) {
  const requestVersion = useRef(0);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarChecklist = useCallback(async (): Promise<void> => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);

    try {
      const data = await getChecklistDelDia(personalId);
      if (version === requestVersion.current) setChecklist(data);
    } catch (err: unknown) {
      if (version !== requestVersion.current) return;
      setError(err instanceof Error ? err.message : 'No se pudo obtener el checklist.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [personalId]);

  useEffect(() => {
    let active = true;
    const version = ++requestVersion.current;
    getChecklistDelDia(personalId)
      .then((data) => {
        if (active && version === requestVersion.current) {
          setChecklist(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (active && version === requestVersion.current)
          setError(err instanceof Error ? err.message : 'Error al cargar checklist.');
      })
      .finally(() => {
        if (active && version === requestVersion.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [personalId]);

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
      setError(err instanceof Error ? err.message : 'No se pudo finalizar la tarea.');
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
