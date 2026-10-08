import { useState, useEffect, useCallback } from 'react';
import { getVencimientos } from './documentacionApi';
import type { EstadoVencimiento, Vencimiento } from './types';

export function useVencimientos() {
  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [estado, setEstado] = useState<EstadoVencimiento | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('fecha_vencimiento');
  const [orden, setOrden] = useState<'asc' | 'desc'>('asc');

  const cargarVencimientos = useCallback(() => {
    setLoading(true);
    getVencimientos(page, size, estado, busqueda, ordenarPor, orden)
      .then((data) => {
        setVencimientos(data.items);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, size, estado, busqueda, ordenarPor, orden]);

  // Al cambiar un filtro volvemos a la primera página
  useEffect(() => { setPage(1); }, [estado, busqueda]);
  useEffect(() => { cargarVencimientos(); }, [cargarVencimientos]);

  const cambiarOrden = (columna: string) => {
    if (ordenarPor === columna) { setOrden(orden === 'asc' ? 'desc' : 'asc'); }
    else { setOrdenarPor(columna); setOrden('asc'); }
  };

  const limpiarFiltros = () => {
    setEstado('');
    setBusqueda('');
  };

  const nextPage = () => { if (page < totalPages) setPage((prev) => prev + 1); };
  const prevPage = () => { if (page > 1) setPage((prev) => prev - 1); };
  const changePage = (newPage: number) => setPage(newPage);

  return {
    vencimientos, loading, error, recargar: cargarVencimientos,
    page, totalPages, total, nextPage, prevPage, changePage,
    estado, setEstado, busqueda, setBusqueda, limpiarFiltros,
    ordenarPor, orden, cambiarOrden,
  };
}
