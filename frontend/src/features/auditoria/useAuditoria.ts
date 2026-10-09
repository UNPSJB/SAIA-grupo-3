import { useSearchParams } from 'react-router-dom';
import { usePagedList } from '../../shared/hooks/usePagedList';
import type { PlanRealizado } from './types';
export function useAuditoria() {
  const [params] = useSearchParams();
  const desde = params.get('desde') || '';
  const hasta = params.get('hasta') || '';
  const list = usePagedList<PlanRealizado>(
    'planes-realizados',
    true,
    `${desde ? `&desde=${encodeURIComponent(desde)}` : ''}${hasta ? `&hasta=${encodeURIComponent(hasta)}` : ''}`,
    'fecha_ejecucion',
    'desc',
  );
  return {
    ...list,
    planesRealizados: list.items,
    desde,
    hasta,
    setDesde: (value: string) => list.update({ desde: value }),
    setHasta: (value: string) => list.update({ hasta: value }),
    limpiarFiltros: () => list.update({ desde: '', hasta: '', buscar: '' }),
    recargar: list.refetch,
  };
}
