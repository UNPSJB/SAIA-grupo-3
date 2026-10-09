import { useSearchParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
export function useListState(defaultSort = 'id', defaultOrder = 'asc') {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const busqueda = params.get('buscar') || '';
  const ordenarPor = params.get('ordenar_por') || defaultSort;
  const orden: 'asc' | 'desc' = (params.get('orden') || defaultOrder) === 'desc' ? 'desc' : 'asc';
  const mostrarInactivos = params.get('mostrar_inactivos') === 'true';
  const update = useCallback(
    (values: Record<string, string>, reset = true) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          Object.entries(values).forEach(([key, value]) =>
            value ? next.set(key, value) : next.delete(key),
          );
          if (reset) next.set('page', '1');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const setPage = useCallback(
    (value: number | ((previous: number) => number)) =>
      update({ page: String(typeof value === 'function' ? value(page) : value) }, false),
    [update, page],
  );
  return {
    page,
    size: 10,
    busqueda,
    ordenarPor,
    orden,
    mostrarInactivos,
    setPage,
    setBusqueda: (value: string) => update({ buscar: value }),
    setMostrarInactivos: (value: boolean) => update({ mostrar_inactivos: String(value) }),
    cambiarOrden: (column: string) =>
      update({
        ordenar_por: column,
        orden: ordenarPor === column && orden === 'asc' ? 'desc' : 'asc',
      }),
    update,
  };
}
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
