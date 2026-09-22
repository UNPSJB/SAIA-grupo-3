import { useState, useEffect, useCallback } from 'react';
import type { Personal } from './types';
import { getPersonal, createPersonal, updatePersonal, deletePersonal } from './personalApi';

export function usePersonal() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [size] = useState(10); 
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const cargarPersonal = useCallback((currentPage: number, currentSize: number) => {
    setLoading(true);
    getPersonal(currentPage, currentSize)
      .then((data) => {
        setPersonal(data.items);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarPersonal(page, size);
  }, [cargarPersonal, page, size]);

  const eliminar = async (dni: number) => {
    await deletePersonal(dni);
    setPersonal((prev) => prev.filter((p) => p.dni !== dni));
    setTotal((prev) => Math.max(0, prev - 1)); // <-- Agregar esta línea
  };

  const guardar = async (datos: Personal, dniExistente?: number) => {
    if (dniExistente) {
      await updatePersonal(dniExistente, datos);
    } else {
      await createPersonal(datos);
    }
    cargarPersonal(page, size);
  };

  // Funciones de navegación
  const nextPage = () => {
    if (page < totalPages) setPage(prev => prev + 1);
  };

  const prevPage = () => {
    if (page > 1) setPage(prev => prev - 1);
  };

  const changePage = (newPage: number) => {
    setPage(newPage);
  };


return {
    personal,
    loading,
    error,
    eliminar,
    guardar,
    page,
    totalPages,    
    total,
    nextPage,
    prevPage,
    changePage
  };
}