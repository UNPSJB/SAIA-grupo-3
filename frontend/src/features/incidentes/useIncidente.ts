import { useCallback, useEffect, useState } from 'react';
import type { Incidente, IncidenteCreateInput, IncidenteUpdateInput } from './types';
import { eliminarIncidente, getIncidentes, guardarIncidente } from './incidenteApi';

export function useIncidente() {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const cargarIncidentes = useCallback(async (currentPage: number, currentSize: number) => {
    setLoading(true);
    try {
      const data = await getIncidentes(currentPage, currentSize);
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
    void cargarIncidentes(page, size);
  }, [cargarIncidentes, page, size]);

  const eliminar = async (id: number) => {
    await eliminarIncidente(id);
    await cargarIncidentes(page, size);
  };

  const guardar = async (datos: IncidenteCreateInput | IncidenteUpdateInput, idExistente?: number) => {
    await guardarIncidente(datos, idExistente);
    await cargarIncidentes(page, size);
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
  };
}
