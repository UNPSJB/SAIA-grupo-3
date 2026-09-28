import { useState, useEffect, useCallback } from 'react';
import { getPlanesRealizados } from './auditoriaApi';
import type { PlanRealizado } from './types';

export function useAuditoria() {
  const [planesRealizados, setPlanesRealizados] = useState<PlanRealizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const cargarHistorial = useCallback(() => {
    setLoading(true);
    getPlanesRealizados(page, size, desde, hasta)
      .then((data) => {
        setPlanesRealizados(data.items);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, size, desde, hasta]);

  useEffect(() => { setPage(1); }, [desde, hasta]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const limpiarFiltros = () => {
    setDesde('');
    setHasta('');
  };

  const nextPage = () => { if (page < totalPages) setPage(p => p + 1); };
  const prevPage = () => { if (page > 1) setPage(p => p - 1); };
  const changePage = (newPage: number) => setPage(newPage);

  return {
    desde, setDesde, hasta, setHasta, limpiarFiltros, 
    planesRealizados, loading, error, 
    page, totalPages, total, nextPage, prevPage, changePage, 
    recargar: cargarHistorial 
  };
}