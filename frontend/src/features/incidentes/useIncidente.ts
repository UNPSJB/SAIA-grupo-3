import { useSearchParams } from 'react-router-dom';
import { usePagedList } from '../../shared/hooks/usePagedList';
import { eliminarIncidente, guardarIncidente } from './incidenteApi';
import type {
  EstadoIncidente,
  Incidente,
  IncidenteCreateInput,
  IncidenteUpdateInput,
} from './types';

export function useIncidente(enabled = true) {
  const [params] = useSearchParams();
  const estado = (params.get('estado') || '') as EstadoIncidente | '';
  const fechaDesde = params.get('fecha_desde') || '';
  const fechaHasta = params.get('fecha_hasta') || '';
  const filtros = new URLSearchParams();
  if (estado) filtros.set('estado', estado);
  if (fechaDesde) filtros.set('fecha_desde', fechaDesde);
  if (fechaHasta) filtros.set('fecha_hasta', fechaHasta);
  const list = usePagedList<Incidente>('incidentes/', enabled, `&${filtros}`, 'fecha_hora', 'desc');
  return {
    ...list,
    incidentes: list.items,
    estado,
    fechaDesde,
    fechaHasta,
    setEstado: (value: EstadoIncidente | '') => list.update({ estado: value }),
    setFechaDesde: (value: string) => list.update({ fecha_desde: value }),
    setFechaHasta: (value: string) => list.update({ fecha_hasta: value }),
    limpiarFiltros: () => list.update({ estado: '', fecha_desde: '', fecha_hasta: '' }),
    eliminar: async (id: number) => {
      await eliminarIncidente(id);
      list.refetch(true);
    },
    guardar: async (datos: IncidenteCreateInput | IncidenteUpdateInput, idExistente?: number) => {
      await guardarIncidente(datos, idExistente);
      list.refetch();
    },
  };
}
