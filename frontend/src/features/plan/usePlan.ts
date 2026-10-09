import type { PlanCreate, PlanUpdate } from './types';
import { createPlan, updatePlan, deletePlan } from './planApi';

import type { Plan as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function usePlan(enabled = true) {
  const list = usePagedList<ListItem>('planes', enabled, '');
  const eliminar = async (id: number) => {
    await deletePlan(id);
    list.refetch(true);
  };
  const guardar = async (datos: PlanCreate | PlanUpdate, idExistente?: number) => {
    if (idExistente) {
      await updatePlan(idExistente, datos as PlanUpdate);
    } else {
      await createPlan(datos as PlanCreate);
    }
    list.refetch();
  };
  return { ...list, planes: list.items, eliminar, guardar };
}
