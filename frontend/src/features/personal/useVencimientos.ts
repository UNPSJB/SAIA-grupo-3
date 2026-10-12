import { useSearchParams } from 'react-router-dom';
import { usePagedList } from '../../shared/hooks/usePagedList';
import type { EstadoVencimiento, Vencimiento } from './types';
export function useVencimientos() {
  const [params] = useSearchParams();
  const estado = (params.get('estado') || '') as EstadoVencimiento | '';
  const soloAlertas = params.get('solo_alertas') === 'true';
  const list = usePagedList<Vencimiento>(
    'documentacion/vencimientos',
    true,
    `${estado ? `&estado=${estado}` : ''}${soloAlertas ? '&solo_alertas=true' : ''}`,
    'fecha_vencimiento',
  );
  return {
    ...list,
    vencimientos: list.items,
    estado,
    soloAlertas,
    setSoloAlertas: (value: boolean) => list.update({ solo_alertas: value ? 'true' : '' }),
    setEstado: (value: EstadoVencimiento | '') => list.update({ estado: value }),
    limpiarFiltros: () => list.update({ estado: '', buscar: '', solo_alertas: '' }),
    recargar: () => list.refetch(),
  };
}
