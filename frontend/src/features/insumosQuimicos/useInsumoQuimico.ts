import { useState, useEffect, useCallback } from 'react';
import type { InsumoQuimico, InsumoQuimicoCreate, InsumoQuimicoUpdate } from './types';
import {
  getInsumosQuimicos,
  createInsumoQuimico,
  updateInsumoQuimico,
  deleteInsumoQuimico,
} from './insumoQuimicoApi';

export function useInsumoQuimico() {
  const [insumosQuimicos, setInsumosQuimicos] = useState<InsumoQuimico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const [ordenarPor, setOrdenarPor] = useState('id');
  const [orden, setOrden] = useState<'asc' | 'desc'>('asc');
  const [busqueda, setBusqueda] = useState('');

  const cargarInsumosQuimicos = useCallback(
    (
      currentPage: number,
      currentSize: number,
      showInactive: boolean,
      sortCol: string,
      sortDir: string,
      searchTerm: string
    ) => {
      setLoading(true);
      getInsumosQuimicos(currentPage, currentSize, showInactive, sortCol, sortDir, searchTerm)
        .then((data) => {
          setInsumosQuimicos(data.items);
          setTotalPages(data.pages);
          setTotal(data.total);
          setPage(data.page);
          setError(null);
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    setPage(1);
  }, [busqueda]);

  useEffect(() => {
    cargarInsumosQuimicos(page, size, mostrarInactivos, ordenarPor, orden, busqueda);
  }, [cargarInsumosQuimicos, page, size, mostrarInactivos, ordenarPor, orden, busqueda]);

  const cambiarOrden = (columna: string) => {
    if (ordenarPor === columna) {
      setOrden(orden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenarPor(columna);
      setOrden('asc');
    }
  };

  const eliminar = async (id: number) => {
    await deleteInsumoQuimico(id);
    cargarInsumosQuimicos(page, size, mostrarInactivos, ordenarPor, orden, busqueda);
  };

  const guardar = async (datos: InsumoQuimicoCreate | InsumoQuimicoUpdate, idExistente?: number) => {
    if (idExistente) {
      await updateInsumoQuimico(idExistente, datos as InsumoQuimicoUpdate);
    } else {
      await createInsumoQuimico(datos as InsumoQuimicoCreate);
    }
    cargarInsumosQuimicos(page, size, mostrarInactivos, ordenarPor, orden, busqueda);
  };

  const nextPage = () => { if (page < totalPages) setPage((prev) => prev + 1); };
  const prevPage = () => { if (page > 1) setPage((prev) => prev - 1); };
  const changePage = (newPage: number) => setPage(newPage);

  return {
    insumosQuimicos,
    loading,
    error,
    eliminar,
    guardar,
    page,
    totalPages,
    total,
    nextPage,
    prevPage,
    changePage,
    mostrarInactivos,
    setMostrarInactivos,
    ordenarPor,
    orden,
    cambiarOrden,
    busqueda,
    setBusqueda,
  };
}