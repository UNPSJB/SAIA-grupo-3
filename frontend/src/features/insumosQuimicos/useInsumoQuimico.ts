import { useSearchParams } from 'react-router-dom';
import type { InsumoQuimicoCreate, InsumoQuimicoUpdate } from './types';
import { createInsumoQuimico, updateInsumoQuimico, deleteInsumoQuimico } from './insumoQuimicoApi';

import type { InsumoQuimico as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function useInsumoQuimico(enabled = true) {
  const [params] = useSearchParams();
  const soloStockBajo = params.get('solo_stock_bajo') === 'true';
  const list = usePagedList<ListItem>('insumos-quimicos', enabled, `&solo_stock_bajo=${soloStockBajo}`);
  const eliminar = async (id: number) => {
    await deleteInsumoQuimico(id);
    list.refetch(true);
  };
  const guardar = async (
    datos: InsumoQuimicoCreate | InsumoQuimicoUpdate,
    idExistente?: number,
  ) => {
    if (idExistente) {
      await updateInsumoQuimico(idExistente, datos as InsumoQuimicoUpdate);
    } else {
      await createInsumoQuimico(datos as InsumoQuimicoCreate);
    }
    list.refetch();
  };
  return { ...list, soloStockBajo, setSoloStockBajo: (valor: boolean) => list.update({ solo_stock_bajo: valor ? 'true' : '' }), insumosQuimicos: list.items, eliminar, guardar };
}
