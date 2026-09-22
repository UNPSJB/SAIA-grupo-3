import { useState, useEffect, useCallback } from 'react';
import type { Tarea } from './types';
import { getTareas, createTarea, updateTarea, deleteTarea } from './tareaApi';

export function useTarea() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const cargarTareas = useCallback((currentPage: number, currentSize: number) => {
    setLoading(true);
    getTareas(currentPage, currentSize)
      .then((data) => {
        setTareas(data.items);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarTareas(page, size);
  }, [cargarTareas, page, size]);

  const eliminar = async (id: number) => {
    await deleteTarea(id);
    cargarTareas(page, size);
  };

  const guardar = async (datos: Tarea, idExistente?: number) => {
    if (idExistente) {
      await updateTarea(idExistente, datos);
    } else {
      await createTarea(datos);
    }
    cargarTareas(page, size);
  };

  const nextPage = () => { if (page < totalPages) setPage(prev => prev + 1); };
  const prevPage = () => { if (page > 1) setPage(prev => prev - 1); };
  const changePage = (newPage: number) => { setPage(newPage); };

  return { 
    tareas, loading, error, eliminar, guardar, 
    page, totalPages, total, nextPage, prevPage, changePage 
  };
}