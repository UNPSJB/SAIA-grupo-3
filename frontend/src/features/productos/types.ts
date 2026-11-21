import type { UnidadMedida } from '../unidadMedida/types';

export interface InsumoRecetaDetalle {
  insumo_id: number;
  insumo_nombre: string;
  cantidad_requerida: number;
  unidad_medida: UnidadMedida;
}

export interface RecetaProductoDetalle {
  receta_id: number;
  version_numero: number;
  rendimiento_cantidad: number;
  rendimiento_unidad: UnidadMedida;
  insumos: InsumoRecetaDetalle[];
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  unidad_medida_id: number;
  unidad_medida: UnidadMedida;
  activo: boolean;
  receta?: RecetaProductoDetalle | null;
}

export interface ProductoCreate {
  nombre: string;
  descripcion?: string | null;
  unidad_medida_id: number;
}

export interface ProductoUpdate {
  nombre?: string;
  descripcion?: string | null;
  unidad_medida_id?: number;
  activo?: boolean;
}

export interface PaginatedProductos {
  items: Producto[];
  total: number;
  page: number;
  size: number;
  pages: number;
}