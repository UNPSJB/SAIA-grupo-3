import { useCallback, useEffect, useState } from 'react';
import { useListState, useDebouncedValue } from '../../shared/hooks/useListState';
import { getVencimientosConsolidados } from './vencimientosApi';
import type {
  EstadoVencimiento,
  OrigenVencimiento,
  VencimientoConsolidado,
} from './types';

export function useVencimientos(origen: OrigenVencimiento, enabled = true) {
  const lista = useListState('fecha_vencimiento', 'asc');
  const {
    page,
    busqueda,
    ordenarPor,
    orden,
    setPage,
    update,
  } = lista;
  const buscar = useDebouncedValue(busqueda);
  const [estado, setEstadoInterno] = useState<EstadoVencimiento | ''>('');
  const [soloAlertas, setSoloAlertasInterno] = useState(false);
  const [items, setItems] = useState<VencimientoConsolidado[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled || buscar !== busqueda) {
      if (!enabled) setLoading(false);
      return;
    }
    let active = true;
    const cargar = async () => {
      setLoading(true);
      try {
        const resultado = await getVencimientosConsolidados(
          page,
          10,
          origen,
          estado,
          soloAlertas,
          buscar,
          ordenarPor === 'elemento' ? 'elemento' : 'fecha_vencimiento',
          orden,
        );
        if (active) {
          setItems(resultado.items);
          setTotal(resultado.total);
          setTotalPages(resultado.pages);
          setError(null);
          if (page > Math.max(1, resultado.pages)) {
            setPage(Math.max(1, resultado.pages));
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron obtener los vencimientos.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void cargar();
    return () => {
      active = false;
    };
  }, [
    origen,
    enabled,
    page,
    revision,
    estado,
    soloAlertas,
    buscar,
    busqueda,
    ordenarPor,
    orden,
    setPage,
  ]);

  const changePage = useCallback((nuevaPagina: number) => {
    setPage(nuevaPagina);
  }, [setPage]);

  const cambiarEstado = (nuevoEstado: EstadoVencimiento | '') => {
    setEstadoInterno(nuevoEstado);
    setPage(1);
  };

  return {
    ...lista,
    items,
    page,
    totalPages,
    total,
    loading,
    error,
    changePage,
    refrescar: () => setRevision((valor) => valor + 1),
    estado,
    setEstado: cambiarEstado,
    soloAlertas,
    setSoloAlertas: (valor: boolean) => {
      setSoloAlertasInterno(valor);
      setPage(1);
    },
    limpiarFiltros: () => {
      setEstadoInterno('');
      setSoloAlertasInterno(false);
      update({ buscar: '' });
    },
    reiniciarFiltros: () => {
      setEstadoInterno('');
      setSoloAlertasInterno(false);
    },
  };
}
