import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePagedList } from '../../../shared/hooks/usePagedList';
import { getAbiertosPorTipo } from '../incidenteApi';
import type { CantidadPorTipo, IncidenteAbierto } from '../types';

export function useIncidentesAbiertos() {
  const [params] = useSearchParams();
  const tipoId = params.get('tipo_id') || '';
  const diasParam = params.get('dias_minimos');
  const diasMinimos =
    diasParam !== null && Number.isFinite(Number(diasParam)) && Number(diasParam) >= 0
      ? Number(diasParam)
      : '';
  const filtros = new URLSearchParams();
  if (tipoId) filtros.set('tipo_id', tipoId);
  if (diasMinimos !== '') filtros.set('dias_minimos', String(diasMinimos));
  const list = usePagedList<IncidenteAbierto>(
    'incidentes/abiertos',
    true,
    `&${filtros}`,
    'fecha_hora',
    'asc',
  );
  const [resumen, setResumen] = useState<{
    datos: CantidadPorTipo[];
    loading: boolean;
    error: string | null;
  }>({ datos: [], loading: true, error: null });

  useEffect(() => {
    let active = true;
    getAbiertosPorTipo()
      .then((datos) => {
        if (active) setResumen({ datos, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (active)
          setResumen({
            datos: [],
            loading: false,
            error: err instanceof Error ? err.message : 'Error al cargar el resumen.',
          });
      });
    return () => {
      active = false;
    };
  }, []);

  return {
    ...list,
    incidentes: list.items,
    porTipo: resumen.datos,
    resumenLoading: resumen.loading,
    resumenError: resumen.error,
    tipoId,
    diasMinimos,
    cambiarTipo: (valor: number | '') => list.update({ tipo_id: String(valor) }),
    cambiarDiasMinimos: (valor: number | '') => list.update({ dias_minimos: String(valor) }),
  };
}
