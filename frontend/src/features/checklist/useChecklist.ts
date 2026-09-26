import { useState, useEffect, useCallback } from 'react';
import type { Checklist } from './types';
import { getChecklistDelDia, finalizarTareaApi } from './checklistApi'; // Actualizado

export function useChecklist(personalDni: number) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarChecklist = useCallback(() => {
    setLoading(true);
    getChecklistDelDia(personalDni)
      .then((data) => {
        setChecklist(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [personalDni]);

  useEffect(() => {
    cargarChecklist();
  }, [cargarChecklist]);

  useEffect(() => {
    window.addEventListener('focus', cargarChecklist);
    return () => window.removeEventListener('focus', cargarChecklist);
  }, [cargarChecklist]);

  // Nueva función para finalizar tarea y recargar
  const finalizarTarea = async (itemId: number) => {
    try {
      await finalizarTareaApi(itemId, personalDni);
      await cargarChecklist();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al finalizar la tarea');
    }
  };

  return { checklist, loading, error, recargar: cargarChecklist, finalizarTarea };
}