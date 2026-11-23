import { useSearchParams } from 'react-router-dom';
import type { Insumo as ListItem, InsumoCreate, InsumoUpdate } from './types';
import { createInsumo, updateInsumo, deleteInsumo } from './InsumoApi';
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
    const resultado = idExistente
      ? await updateInsumo(idExistente, datos as InsumoUpdate)
      : await createInsumo(datos as InsumoCreate);
    list.refetch();
    return resultado;
  };

  return {
    ...list,
    soloStockBajo,
    setSoloStockBajo: (valor: boolean) => list.update({ solo_stock_bajo: valor ? 'true' : '' }),
    insumos: list.items,
    eliminar,
    guardar,
  };
}