import { useEffect, useState } from 'react';
import { getAbiertosPorTipo, getIncidentesAbiertos } from '../incidenteApi';
import type { CantidadPorTipo, IncidenteAbierto, TipoIncidente } from '../types';

const TAMANIO_PAGINA = 10;

export function useIncidentesAbiertos() {
  const [incidentes, setIncidentes] = useState<IncidenteAbierto[]>([]);
  const [porTipo, setPorTipo] = useState<CantidadPorTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Filtros
  const [tipo, setTipo] = useState<TipoIncidente | ''>('');
  const [diasMinimos, setDiasMinimos] = useState<number | ''>('');

  // Listado: se vuelve a pedir cuando cambian la página o los filtros
  useEffect(() => {
    let componenteActivo = true;
    getIncidentesAbiertos(page, TAMANIO_PAGINA, tipo, diasMinimos)
      .then((data) => {
        if (!componenteActivo) return;
        setIncidentes(data.items);
        setTotal(data.total);
        setTotalPages(data.pages);
        setError(null);
      })
      .catch((err: unknown) => {
        if (componenteActivo) setError(err instanceof Error ? err.message : 'Error al cargar los incidentes.');
      })
      .finally(() => {
        if (componenteActivo) setLoading(false);
      });
    return () => {
      componenteActivo = false;
    };
  }, [page, tipo, diasMinimos]);

  // Resumen por tipo: no depende de los filtros (siempre muestra el total de abiertos)
  useEffect(() => {
    let componenteActivo = true;
    getAbiertosPorTipo()
      .then((data) => {
        if (componenteActivo) setPorTipo(data);
      })
      .catch((err: unknown) => {
        if (componenteActivo) setError(err instanceof Error ? err.message : 'Error al cargar el resumen.');
      });
    return () => {
      componenteActivo = false;
    };
  }, []);

  // Al cambiar un filtro se vuelve a la página 1
  const cambiarTipo = (valor: TipoIncidente | '') => { setTipo(valor); setPage(1); };
  const cambiarDiasMinimos = (valor: number | '') => { setDiasMinimos(valor); setPage(1); };

  return {
    incidentes, porTipo, loading, error,
    page, totalPages, total, setPage,
    tipo, cambiarTipo, diasMinimos, cambiarDiasMinimos,
  };
}
