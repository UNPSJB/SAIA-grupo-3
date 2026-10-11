import { useCallback, useEffect, useState } from 'react';
import type { EstadoIncidente, Incidente, IncidenteCreateInput, IncidenteUpdateInput } from './types';
import { eliminarIncidente, getIncidentes, guardarIncidente } from './incidenteApi';

export function useIncidente() {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [estado, setEstado] = useState<EstadoIncidente | ''>('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const cargarIncidentes = useCallback(async (currentPage: number, currentSize: number, currentEstado: EstadoIncidente | '', currentDesde: string, currentHasta: string) => {
    setLoading(true);
    try {
      const data = await getIncidentes(currentPage, currentSize, currentEstado, currentDesde, currentHasta);
      setIncidentes(data.items);
      setTotalPages(data.pages);
      setTotal(data.total);
      setPage(data.page);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar los incidentes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarIncidentes(page, size, estado, fechaDesde, fechaHasta);
  }, [cargarIncidentes, page, size, estado, fechaDesde, fechaHasta]);

  // Al cambiar un filtro volvemos a la primera página
  useEffect(() => { setPage(1); }, [estado, fechaDesde, fechaHasta]);

  const limpiarFiltros = () => {
    setEstado('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const eliminar = async (id: number) => {
    await eliminarIncidente(id);
    await cargarIncidentes(page, size, estado, fechaDesde, fechaHasta);
  };

  const guardar = async (datos: IncidenteCreateInput | IncidenteUpdateInput, idExistente?: number) => {
    await guardarIncidente(datos, idExistente);
    await cargarIncidentes(page, size, estado, fechaDesde, fechaHasta);
  };

  const nextPage = () => {
    if (page < totalPages) setPage((prev) => prev + 1);
  };

  const prevPage = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  const changePage = (newPage: number) => setPage(newPage);

  return {
    incidentes,
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
    estado,
    setEstado,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    limpiarFiltros,
  };
}
