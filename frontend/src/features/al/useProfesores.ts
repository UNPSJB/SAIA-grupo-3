import { useState, useEffect, useCallback } from 'react';
import type { Profesor } from './types';
import { getProfesores, createProfesor, updateProfesor, deleteProfesor } from './profesoresApi';

export function useProfesores() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarProfesores = useCallback(() => {
    setLoading(true);
    getProfesores()
      .then((data) => {
        setProfesores(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarProfesores();
  }, [cargarProfesores]);

  const eliminar = async (id: number) => {
    if (!window.confirm('¿Seguro que querés eliminar este profesor?')) return;
    try {
      await deleteProfesor(id);
      setProfesores((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const guardar = async (datos: Partial<Profesor>, id?: number) => {
    if (id) {
      await updateProfesor(id, datos);
    } else {
      await createProfesor(datos as Omit<Profesor, 'id'>);
    }
    cargarProfesores();
  };

  return { profesores, loading, error, eliminar, guardar };
}