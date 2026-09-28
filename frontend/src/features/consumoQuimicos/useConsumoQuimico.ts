import { useState, useEffect, useCallback } from 'react';
import type { ConsumoQuimico } from './types';
import { getConsumos, createConsumo, updateConsumo, deleteConsumo } from './consumoQuimicoApi';

export function useConsumoQuimico() {
  const [consumos, setConsumos] = useState<ConsumoQuimico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState('fecha');
  const [orden, setOrden] = useState<'asc' | 'desc'>('desc');

  const cargarConsumos = useCallback(() => {
    setLoading(true);
    getConsumos(page, size, mostrarInactivos, ordenarPor, orden)
      .then((data) => {
        setConsumos(data.items);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, size, mostrarInactivos, ordenarPor, orden]);

  useEffect(() => {
    cargarConsumos();
  }, [cargarConsumos]);

  const cambiarOrden = (columna: string) => {
    if (ordenarPor === columna) { setOrden(orden === 'asc' ? 'desc' : 'asc'); } 
    else { setOrdenarPor(columna); setOrden('desc'); }
  };

  const guardarConsumo = async (datos: ConsumoQuimico, idExistente?: number) => {
    if (idExistente) await updateConsumo(idExistente, datos);
    else await createConsumo(datos);
    cargarConsumos();
  };

  const eliminarConsumo = async (id: number) => {
    await deleteConsumo(id);
    cargarConsumos();
  };

  const nextPage = () => { if (page < totalPages) setPage(p => p + 1); };
  const prevPage = () => { if (page > 1) setPage(p => p - 1); };
  const changePage = (p: number) => setPage(p);

  return { 
    consumos, loading, error, guardarConsumo, eliminarConsumo,
    page, totalPages, total, nextPage, prevPage, changePage,
    mostrarInactivos, setMostrarInactivos, ordenarPor, orden, cambiarOrden
  };
}