import type { Equipo } from './types';
import { createEquipo, updateEquipo, deleteEquipo } from './equipoApi';

import type { Equipo as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function useEquipo(enabled = true) {
  const list = usePagedList<ListItem>('equipos', enabled, '');
  const eliminar = async (id: number) => {
    await deleteEquipo(id);
    list.refetch(true);
  };
  const guardar = async (datos: Equipo, idExistente?: number) => {
    if (idExistente) {
      await updateEquipo(idExistente, datos);
    } else {
      await createEquipo(datos);
    }
    list.refetch();
  };
  return { ...list, equipos: list.items, eliminar, guardar };
}
