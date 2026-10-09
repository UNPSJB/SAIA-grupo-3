import type { Elemento } from './types';
import {
  createElemento,
  updateElemento,
  deleteElemento,
  registrarRecambioApi,
} from './elementoApi';

import type { Elemento as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function useElemento(enabled = true) {
  const list = usePagedList<ListItem>('elementos', enabled, '');
  const eliminar = async (id: number) => {
    await deleteElemento(id);
    list.refetch(true);
  };
  const guardar = async (datos: Elemento, idExistente?: number) => {
    if (idExistente) {
      await updateElemento(idExistente, datos);
    } else {
      await createElemento(datos);
    }
    list.refetch();
  };
  const registrarRecambio = async (id: number, fecha = new Date().toLocaleDateString('en-CA')) => {
    await registrarRecambioApi(id, fecha);
    list.refetch();
  };
  return { registrarRecambio, ...list, elementos: list.items, eliminar, guardar };
}
