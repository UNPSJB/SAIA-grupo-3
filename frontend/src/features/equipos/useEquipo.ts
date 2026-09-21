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
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  // NUEVOS ESTADOS DE ORDENAMIENTO
  const [ordenarPor, setOrdenarPor] = useState('id');
  const [orden, setOrden] = useState<'asc' | 'desc'>('asc');

  const cargarEquipos = useCallback((
    currentPage: number, 
    currentSize: number, 
    showInactive: boolean,
    sortCol: string,
    sortDir: string
  ) => {
    setLoading(true);
    getEquipos(currentPage, currentSize, showInactive, sortCol, sortDir)
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
    cargarEquipos(page, size, mostrarInactivos, ordenarPor, orden);
  }, [cargarEquipos, page, size, mostrarInactivos, ordenarPor, orden]);

  // Función para manejar el click en las columnas
  const cambiarOrden = (columna: string) => {
    if (ordenarPor === columna) {
      setOrden(orden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenarPor(columna);
      setOrden('asc');
    }
  };

  const eliminar = async (id: number) => {
    await deleteEquipo(id);
    cargarEquipos(page, size, mostrarInactivos, ordenarPor, orden);
  };

  const guardar = async (datos: Equipo, idExistente?: number) => {
    if (idExistente) {
      await updateEquipo(idExistente, datos);
    } else {
      await createEquipo(datos);
    }
    cargarEquipos(page, size, mostrarInactivos, ordenarPor, orden);
  };

  const nextPage = () => { if (page < totalPages) setPage((prev) => prev + 1); };
  const prevPage = () => { if (page > 1) setPage((prev) => prev - 1); };
  const changePage = (newPage: number) => setPage(newPage);

  return {
    equipos, loading, error, eliminar, guardar,
    page, totalPages, total, nextPage, prevPage, changePage,
    mostrarInactivos, setMostrarInactivos,
    ordenarPor, orden, cambiarOrden 
  };
}