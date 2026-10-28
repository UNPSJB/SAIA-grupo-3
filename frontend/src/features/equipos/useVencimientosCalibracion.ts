import { useSearchParams } from 'react-router-dom';
import { usePagedList } from '../../shared/hooks/usePagedList';
import type { EstadoVencimientoCalibracion, VencimientoCalibracion } from './types';

export function useVencimientosCalibracion(enabled = true) {
  const [params] = useSearchParams();
  const estado = (params.get('estado') || '') as EstadoVencimientoCalibracion | '';
  const soloAlertas = params.get('solo_alertas') === 'true';

  const filtros = new URLSearchParams();
  if (estado) filtros.set('estado', estado);
  if (soloAlertas) filtros.set('solo_alertas', 'true');

  const list = usePagedList<VencimientoCalibracion>(
    'calibraciones/vencimientos',
    enabled,
    filtros.toString() ? `&${filtros.toString()}` : '',
    'fecha_vencimiento',
    'asc',
  );

  return {
    ...list,
    vencimientos: list.items,
    recargar: list.refetch,
    estado,
    soloAlertas,
    setSoloAlertas: (valor: boolean) =>
      list.update({ solo_alertas: valor ? 'true' : '' }),
    setEstado: (valor: EstadoVencimientoCalibracion | '') => list.update({ estado: valor }),
    limpiarFiltros: () => list.update({ buscar: '', estado: '', solo_alertas: '' }),
  };
}