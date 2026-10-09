import type { ConsumoQuimico } from './types';
import { createConsumo, updateConsumo, deleteConsumo } from './consumoQuimicoApi';

import type { ConsumoQuimico as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function useConsumoQuimico(enabled = true) {
  const list = usePagedList<ListItem>('consumo-quimico', enabled, '', 'fecha', 'desc');
  const guardarConsumo = async (datos: ConsumoQuimico, idExistente?: number) => {
    if (idExistente) await updateConsumo(idExistente, datos);
    else await createConsumo(datos);
    list.refetch();
  };
  const eliminarConsumo = async (id: number) => {
    await deleteConsumo(id);
    list.refetch(true);
  };
  return { ...list, consumos: list.items, guardarConsumo, eliminarConsumo };
}
