import { useEffect, useState } from 'react';
import { useListState, useDebouncedValue } from './useListState';
import { API_BASE_URL, fetchWithAuth } from '../libreria/api';
export function usePagedList<T>(
  endpoint: string,
  enabled = true,
  extra = '',
  defaultSort = 'id',
  defaultOrder = 'asc',
) {
  const state = useListState(defaultSort, defaultOrder);
  const { page, size, busqueda, ordenarPor, orden, mostrarInactivos, setPage } = state;
  const search = useDebouncedValue(busqueda);
  const [result, setResult] = useState<{ items: T[]; total: number; pages: number }>({
    items: [],
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled || search !== busqueda) return;
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      buscar: search,
      ordenar_por: ordenarPor,
      orden,
      mostrar_inactivos: String(mostrarInactivos),
    });
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/${endpoint}?${params}${extra}`);
        if (!response.ok) throw new Error('No se pudo cargar el listado.');
        const data = await response.json();
        if (
          !Array.isArray(data.items) ||
          !Number.isInteger(data.pages) ||
          typeof data.total !== 'number'
        )
          throw new Error('El servidor devolvió un listado inválido.');
        if (active) {
          setResult(data);
          setError(null);
          if (page > Math.max(1, data.pages)) setPage(Math.max(1, data.pages));
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [
    endpoint,
    enabled,
    extra,
    page,
    size,
    search,
    busqueda,
    ordenarPor,
    orden,
    mostrarInactivos,
    revision,
    setPage,
  ]);
  const refetch = (afterDelete = false) => {
    if (afterDelete && result.items.length === 1 && page > 1) setPage(page - 1);
    else setRevision((value) => value + 1);
  };
  return {
    ...state,
    ...result,
    totalPages: result.pages,
    loading,
    error,
    refetch,
    nextPage: () => {
      if (page < result.pages) setPage(page + 1);
    },
    prevPage: () => {
      if (page > 1) setPage(page - 1);
    },
    changePage: setPage,
  };
}
