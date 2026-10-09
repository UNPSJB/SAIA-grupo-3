import type { Sector } from './types';
import { createSector, updateSector, deleteSector } from './sectorApi';

import type { Sector as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function useSector(enabled = true) {
  const list = usePagedList<ListItem>('sectores', enabled, '');
  const eliminar = async (id: number) => {
    await deleteSector(id);
    list.refetch(true);
  };
  const guardar = async (datos: Sector, idExistente?: number) => {
    if (idExistente) {
      await updateSector(idExistente, datos);
    } else {
      await createSector(datos);
    }
    list.refetch();
  };
  return { ...list, sectores: list.items, eliminar, guardar };
}
