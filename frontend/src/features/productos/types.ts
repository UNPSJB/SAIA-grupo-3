import type { UnidadMedida } from '../unidadMedida/types';

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  unidad_medida_id: number;
  unidad_medida: UnidadMedida;
  activo: boolean;
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
