import type { PersonalCreateInput, PersonalUpdateInput } from './types';
import { createPersonal, updatePersonal, deletePersonal } from './personalApi';

import type { Personal as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function usePersonal(proximosAVencer = false, enabled = true) {
  const list = usePagedList<ListItem>('personal', enabled, `&proximos_a_vencer=${proximosAVencer}`);
  const eliminar = async (id: number) => {
    await deletePersonal(id);
    list.refetch(true);
  };
  const guardar = async (
    datos: PersonalCreateInput | PersonalUpdateInput,
    idExistente?: number,
  ) => {
    if (idExistente !== undefined) {
      await updatePersonal(idExistente, datos);
    } else {
      await createPersonal(datos as PersonalCreateInput);
    }

    list.refetch();
  };
  return { ...list, personal: list.items, eliminar, guardar };
}
