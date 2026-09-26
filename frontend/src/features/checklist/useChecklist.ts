import { useState, useEffect, useCallback } from 'react';
import type { Checklist } from './types';
import { getChecklistDelDia } from './checklistApi';

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

  // Si el plan se modificó (por ejemplo, en otra pestaña), al volver a esta
  // ventana se vuelve a pedir el checklist para mostrarlo actualizado.
  useEffect(() => {
    window.addEventListener('focus', cargarChecklist);
    return () => window.removeEventListener('focus', cargarChecklist);
  }, [cargarChecklist]);

  return { checklist, loading, error, recargar: cargarChecklist };
}
