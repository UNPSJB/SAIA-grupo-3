import { useState, useEffect, useCallback } from 'react';
import type { Equipo } from './types';
import { getEquipos, createEquipo, updateEquipo, deleteEquipo } from './equipoApi';

export function useEquipo() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  

  const cargarEquipos = useCallback((currentPage: number, currentSize: number) => {
    setLoading(true);
    getEquipos(currentPage, currentSize)
      .then((data) => {
        setEquipos(data.items);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarEquipos(page, size);
  }, [cargarEquipos, page, size]);

  const eliminar = async (id: number) => {
    await deleteEquipo(id);
    cargarEquipos(page, size); 
  };

  const guardar = async (datos: Equipo, idExistente?: number) => {
    if (idExistente) {
      await updateEquipo(idExistente, datos);
    } else {
      await createEquipo(datos);
    }
    cargarEquipos(page, size);
  };


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
    equipos, loading, error, eliminar, guardar, 
    page, totalPages, total, nextPage, prevPage, changePage 
  };
}