import { useState, useEffect, useCallback } from 'react';
import { getUnidadesMedida, createUnidadMedida, updateUnidadMedida, deleteUnidadMedida } from './unidadMedidaApi';
import type { UnidadMedida } from './types';

export const useUnidadMedida = () => {
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState('id');
  const [orden, setOrden] = useState<'asc' | 'desc'>('asc');
  const [busqueda, setBusqueda] = useState('');

  const fetchUnidades = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUnidadesMedida(page, size, mostrarInactivos, ordenarPor, orden, busqueda);
      setUnidades(data.items);
      setTotalPages(data.pages);
      setTotal(data.total);
      setPage(data.page);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las unidades de medida');
    } finally {
      setLoading(false);
    }
  }, [page, size, mostrarInactivos, ordenarPor, orden, busqueda]);

  useEffect(() => { setPage(1); }, [busqueda]);
  useEffect(() => { fetchUnidades(); }, [fetchUnidades]);

  const cambiarOrden = (columna: string) => {
    if (ordenarPor === columna) { setOrden(orden === 'asc' ? 'desc' : 'asc'); } 
    else { setOrdenarPor(columna); setOrden('asc'); }
  };

  const guardar = async (unidad: { tipo?: string; sufijo?: string; activo?: boolean }, idExistente?: number) => {
    try {
      if (idExistente) {
        await updateUnidadMedida(idExistente, unidad);
      } else {
        await createUnidadMedida(unidad as any);
      }
      await fetchUnidades();
    } catch (err: any) {
      throw new Error(err.message || 'Error al guardar la unidad de medida');
    }
  };

  const eliminar = async (id: number) => {
    try {
      await deleteUnidadMedida(id);
      await fetchUnidades();
    } catch (err: any) {
      throw new Error(err.message || 'Error al eliminar la unidad de medida');
    }
  };

  const nextPage = () => { if (page < totalPages) setPage((prev) => prev + 1); };
  const prevPage = () => { if (page > 1) setPage((prev) => prev - 1); };
  const changePage = (newPage: number) => setPage(newPage);

  return { 
    unidades, loading, error, guardar, eliminar, refetch: fetchUnidades,
    page, totalPages, total, nextPage, prevPage, changePage,
    mostrarInactivos, setMostrarInactivos, ordenarPor, orden, cambiarOrden,
    busqueda, setBusqueda
  };
};