import { useSearchParams } from 'react-router-dom';
import type { InsumoCreate, InsumoUpdate } from './types';
import { createInsumo, updateInsumo, deleteInsumo } from './InsumoApi';

import type { Insumo as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function useInsumo(enabled = true) {
  const [params] = useSearchParams();
  const soloStockBajo = params.get('solo_stock_bajo') === 'true';
  const list = usePagedList<ListItem>('insumos', enabled, `&solo_stock_bajo=${soloStockBajo}`);
  const eliminar = async (id: number) => {
    await deleteInsumo(id);
    list.refetch(true);
  };
  const guardar = async (datos: InsumoCreate | InsumoUpdate, idExistente?: number) => {
    if (idExistente) {
      await updateInsumo(idExistente, datos as InsumoUpdate);
    } else {
      await createInsumo(datos as InsumoCreate);
    }
    list.refetch();
  };
  return { ...list, soloStockBajo, setSoloStockBajo: (valor: boolean) => list.update({ solo_stock_bajo: valor ? 'true' : '' }), insumos: list.items, eliminar, guardar };
}
