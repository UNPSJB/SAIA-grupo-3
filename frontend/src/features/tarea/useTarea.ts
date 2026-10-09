import type { TareaCreate } from './types';
import { createTarea, updateTarea, deleteTarea } from './tareaApi';

import type { Tarea as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function useTarea(enabled = true) {
  const list = usePagedList<ListItem>('tareas', enabled, '');
  const eliminar = async (id: number) => {
    await deleteTarea(id);
    list.refetch(true);
  };
  const guardar = async (datos: TareaCreate, idExistente?: number) => {
    if (idExistente) {
      await updateTarea(idExistente, datos);
    } else {
      await createTarea(datos);
    }
    list.refetch();
  };
  return { ...list, tareas: list.items, eliminar, guardar };
}
