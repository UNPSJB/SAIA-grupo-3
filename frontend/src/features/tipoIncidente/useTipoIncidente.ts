import { createTipoIncidente, deleteTipoIncidente, updateTipoIncidente } from './tipoIncidenteApi';
import type { TipoIncidenteDatos } from './types';

import type { TipoIncidente as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function useTipoIncidente(enabled = true) {
  const list = usePagedList<ListItem>('tipos-incidente', enabled, '');
  const guardar = async (datos: TipoIncidenteDatos, idExistente?: number) => {
    if (idExistente) {
      await updateTipoIncidente(idExistente, datos);
    } else {
      if (!datos.nombre) throw new Error('El nombre del tipo de incidente es obligatorio.');
      if (!datos.color) throw new Error('El color del tipo de incidente es obligatorio.');
      await createTipoIncidente({ nombre: datos.nombre, color: datos.color });
    }
    list.refetch();
  };
  const eliminar = async (id: number) => {
    await deleteTipoIncidente(id);
    list.refetch(true);
  };
  return {
    ...list,
    tiposIncidente: list.items,
    guardar,
    eliminar,
    cargarTiposIncidente: list.refetch,
  };
}
