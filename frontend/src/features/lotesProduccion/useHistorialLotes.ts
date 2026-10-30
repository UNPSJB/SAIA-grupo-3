import { useSearchParams } from 'react-router-dom';
import { usePagedList } from '../../shared/hooks/usePagedList';
import type { LoteProduccion } from './types';

export function useHistorialLotes() {
  const [params] = useSearchParams();
  const productoId = params.get('producto_id') || '';
  const desde = params.get('fecha_desde') || '';
  const hasta = params.get('fecha_hasta') || '';
  const filtros = new URLSearchParams();
  if (productoId) filtros.set('producto_id', productoId);
  if (desde) filtros.set('fecha_desde', desde);
  if (hasta) filtros.set('fecha_hasta', hasta);
  const extra = filtros.toString();
  const list = usePagedList<LoteProduccion>(
    'lotes-produccion/',
    true,
    extra ? `&${extra}` : '',
    'fecha_produccion',
    'desc',
  );
  return {
    ...list,
    lotes: list.items,
    productoId,
    desde,
    hasta,
    setProductoId: (value: string) => list.update({ producto_id: value }),
    setDesde: (value: string) => list.update({ fecha_desde: value }),
    setHasta: (value: string) => list.update({ fecha_hasta: value }),
    limpiarFiltros: () =>
      list.update({ producto_id: '', fecha_desde: '', fecha_hasta: '', buscar: '' }),
  };
}
