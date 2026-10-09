import { createUnidadMedida, updateUnidadMedida, deleteUnidadMedida } from './unidadMedidaApi';
import type { UnidadMedida as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function useUnidadMedida(enabled = true) {
  const list = usePagedList<ListItem>('unidades-medida', enabled, '');
  const guardar = async (
    datos: { tipo?: string; sufijo?: string; activo?: boolean },
    id?: number,
  ) => {
    if (id !== undefined) await updateUnidadMedida(id, datos);
    else {
      if (!datos.tipo || !datos.sufijo) throw new Error('Tipo y sufijo son obligatorios.');
      await createUnidadMedida({ tipo: datos.tipo, sufijo: datos.sufijo });
    }
    list.refetch();
  };
  const eliminar = async (id: number) => {
    await deleteUnidadMedida(id);
    list.refetch(true);
  };
  return { ...list, unidades: list.items, guardar, eliminar };
}
