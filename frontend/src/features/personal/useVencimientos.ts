import { useSearchParams } from 'react-router-dom';
import { usePagedList } from '../../shared/hooks/usePagedList';
import type { EstadoVencimiento, Vencimiento } from './types';
export function useVencimientos() {
  const [params] = useSearchParams();
  const estado = (params.get('estado') || '') as EstadoVencimiento | '';
  const list = usePagedList<Vencimiento>(
    'documentacion/vencimientos',
    true,
    estado ? `&estado=${estado}` : '',
    'fecha_vencimiento',
  );
  return {
    ...list,
    vencimientos: list.items,
    estado,
    setEstado: (value: EstadoVencimiento | '') => list.update({ estado: value }),
    limpiarFiltros: () => list.update({ estado: '', buscar: '' }),
    recargar: () => list.refetch(),
  };
}
