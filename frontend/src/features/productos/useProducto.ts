import { usePagedList } from '../../shared/hooks/usePagedList';
import { createProducto, deleteProducto, updateProducto } from './productoApi';
import type { Producto, ProductoCreate, ProductoUpdate } from './types';

export function useProducto(enabled = true) {
  const list = usePagedList<Producto>('productos/', enabled, '', 'nombre', 'asc');

  const guardar = async (datos: ProductoCreate | ProductoUpdate, idExistente?: number) => {
    const producto = idExistente
      ? await updateProducto(idExistente, datos as ProductoUpdate)
      : await createProducto(datos as ProductoCreate);
    list.refetch();
    return producto;
  };

  const eliminar = async (id: number) => {
    await deleteProducto(id);
    list.refetch(true);
  };

  return { ...list, productos: list.items, guardar, eliminar };
}
