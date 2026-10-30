import { usePagedList } from '../../shared/hooks/usePagedList';
import { createLoteProduccion } from './loteProduccionApi';
import type { LoteProduccion, LoteProduccionCreate } from './types';

export function useLotesProduccion(enabled = true) {
  const list = usePagedList<LoteProduccion>(
    'lotes-produccion/',
    enabled,
    '',
    'fecha_produccion',
    'desc',
  );

  const registrar = async (datos: LoteProduccionCreate) => {
    const lote = await createLoteProduccion(datos);
    list.refetch();
    return lote;
  };

  return { ...list, lotes: list.items, registrar };
}