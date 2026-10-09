import type { InsumoQuimicoCreate, InsumoQuimicoUpdate } from './types';
import { createInsumoQuimico, updateInsumoQuimico, deleteInsumoQuimico } from './insumoQuimicoApi';

import type { InsumoQuimico as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function useInsumoQuimico(enabled = true) {
  const list = usePagedList<ListItem>('insumos-quimicos', enabled, '');
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
  return { ...list, insumosQuimicos: list.items, eliminar, guardar };
}
