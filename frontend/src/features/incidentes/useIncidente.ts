import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePagedList } from '../../shared/hooks/usePagedList';
import { eliminarIncidente, guardarIncidente } from './incidenteApi';
import { getTiposIncidenteActivos } from '../tipoIncidente/tipoIncidenteApi';
import { avisarCambioIncidentes } from './eventos';
import type {
  EstadoIncidente,
  Incidente,
  IncidenteCreateInput,
  IncidenteUpdateInput,
  TipoIncidente,
} from './types';

export function useIncidente(enabled = true) {
  const [params] = useSearchParams();
  const estado = (params.get('estado') || '') as EstadoIncidente | '';
  const tipoId = params.get('tipo_id') || '';
  const fechaDesde = params.get('fecha_desde') || '';
  const fechaHasta = params.get('fecha_hasta') || '';
  const filtros = new URLSearchParams();
  if (estado) filtros.set('estado', estado);
  if (tipoId) filtros.set('tipo_id', tipoId);
  if (fechaDesde) filtros.set('fecha_desde', fechaDesde);
  if (fechaHasta) filtros.set('fecha_hasta', fechaHasta);
  const list = usePagedList<Incidente>('incidentes/', enabled, `&${filtros}`, 'fecha_hora', 'desc');
  const [tiposActivos, setTiposActivos] = useState<TipoIncidente[]>([]);

  useEffect(() => {
    let activo = true;
    getTiposIncidenteActivos()
      .then((datos) => {
        if (activo) setTiposActivos(datos);
      })
      .catch(() => {
        if (activo) setTiposActivos([]);
      });
    return () => {
      activo = false;
    };
  }, []);

  return {
    ...list,
    incidentes: list.items,
    estado,
    tipoId,
    fechaDesde,
    fechaHasta,
    tiposActivos,
    setEstado: (value: EstadoIncidente | '') => list.update({ estado: value }),
    setTipoId: (value: string) => list.update({ tipo_id: value }),
    setFechaDesde: (value: string) => list.update({ fecha_desde: value }),
    setFechaHasta: (value: string) => list.update({ fecha_hasta: value }),
    /** Desde el gráfico: muestra los incidentes de un tipo en el período del gráfico. */
    filtrarPorTipo: (tipoIdNuevo: string, desde: string, hasta: string) =>
      list.update({ tipo_id: tipoIdNuevo, fecha_desde: desde, fecha_hasta: hasta }),
    limpiarFiltros: () =>
      list.update({ buscar: '', estado: '', tipo_id: '', fecha_desde: '', fecha_hasta: '' }),
    eliminar: async (id: number) => {
      await eliminarIncidente(id);
      avisarCambioIncidentes();
      list.refetch(true);
    },
    guardar: async (datos: IncidenteCreateInput | IncidenteUpdateInput, idExistente?: number) => {
      await guardarIncidente(datos, idExistente);
      avisarCambioIncidentes();
      list.refetch();
    },
  };
}
