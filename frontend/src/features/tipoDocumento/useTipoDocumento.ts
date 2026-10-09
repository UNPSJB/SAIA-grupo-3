import { createTipoDocumento, deleteTipoDocumento, updateTipoDocumento } from './tipoDocumentoApi';
import type { TipoDocumentoDatos } from './types';

import type { TipoDocumento as ListItem } from './types';
import { usePagedList } from '../../shared/hooks/usePagedList';

export function useTipoDocumento(enabled = true) {
  const list = usePagedList<ListItem>('tipos-documento', enabled, '');
  const guardar = async (datos: TipoDocumentoDatos, idExistente?: number) => {
    if (idExistente) {
      await updateTipoDocumento(idExistente, datos);
    } else {
      if (!datos.nombre) throw new Error('El nombre del tipo de documento es obligatorio.');
      await createTipoDocumento({ nombre: datos.nombre });
    }
    list.refetch();
  };
  const eliminar = async (id: number) => {
    await deleteTipoDocumento(id);
    list.refetch(true);
  };
  return {
    ...list,
    tiposDocumento: list.items,
    guardar,
    eliminar,
    cargarTiposDocumento: list.refetch,
  };
}
