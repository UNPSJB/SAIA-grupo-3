import { useState, useEffect, useCallback } from 'react';
import type { Insumo, InsumoCreate, InsumoUpdate } from './types';
import { getInsumos, createInsumo, updateInsumo, deleteInsumo } from './InsumoApi';

export function useInsumo() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
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

  const cargarInsumos = useCallback(() => {
    setLoading(true);
    getInsumos(page, size, mostrarInactivos, ordenarPor, orden, busqueda)
      .then((data) => {
        setInsumos(data.items);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, size, mostrarInactivos, ordenarPor, orden, busqueda]);

  useEffect(() => { setPage(1); }, [busqueda]);
  useEffect(() => { cargarInsumos(); }, [cargarInsumos]);

  const cambiarOrden = (columna: string) => {
    if (ordenarPor === columna) { setOrden(orden === 'asc' ? 'desc' : 'asc'); } 
    else { setOrdenarPor(columna); setOrden('asc'); }
  };

  const eliminar = async (id: number) => {
    await deleteInsumo(id);
    cargarInsumos();
  };

  const guardar = async (datos: InsumoCreate | InsumoUpdate, idExistente?: number) => {
    if (idExistente) { await updateInsumo(idExistente, datos as InsumoUpdate); } 
    else { await createInsumo(datos as InsumoCreate); }
    cargarInsumos();
  };

  const nextPage = () => { if (page < totalPages) setPage((prev) => prev + 1); };
  const prevPage = () => { if (page > 1) setPage((prev) => prev - 1); };
  const changePage = (newPage: number) => setPage(newPage);

  return {
    insumos, loading, error, eliminar, guardar,
    page, totalPages, total, nextPage, prevPage, changePage,
    mostrarInactivos, setMostrarInactivos, ordenarPor, orden, cambiarOrden,
    busqueda, setBusqueda
  };
}