import { useState, useEffect, useCallback } from 'react';
import type { Elemento } from './types';
import { getElementos, createElemento, updateElemento, deleteElemento } from './elementoApi';

export function useElemento() {
  const [elementos, setElementos] = useState<Elemento[]>([]);
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

  const cargarElementos = useCallback((
    currentPage: number, 
    currentSize: number, 
    showInactive: boolean,
    sortCol: string,
    sortDir: string
  ) => {
    setLoading(true);
    getElementos(currentPage, currentSize, showInactive, sortCol, sortDir)
      .then((data) => {
        setElementos(data.items);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarElementos(page, size, mostrarInactivos, ordenarPor, orden);
  }, [cargarElementos, page, size, mostrarInactivos, ordenarPor, orden]);

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
    await deleteElemento(id);
    cargarElementos(page, size, mostrarInactivos, ordenarPor, orden);
  };

  const guardar = async (datos: Elemento, idExistente?: number) => {
    if (idExistente) {
      await updateElemento(idExistente, datos);
    } else {
      await createElemento(datos);
    }
    cargarElementos(page, size, mostrarInactivos, ordenarPor, orden);
  };

  const nextPage = () => { if (page < totalPages) setPage((prev) => prev + 1); };
  const prevPage = () => { if (page > 1) setPage((prev) => prev - 1); };
  const changePage = (newPage: number) => setPage(newPage);

  return {
    elementos, loading, error, eliminar, guardar,
    page, totalPages, total, nextPage, prevPage, changePage,
    mostrarInactivos, setMostrarInactivos,
    ordenarPor, orden, cambiarOrden 
  };
}