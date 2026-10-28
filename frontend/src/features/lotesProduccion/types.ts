import type { Producto } from '../productos/types';

export interface PersonalResumen {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
}

export interface LoteProduccion {
  id: number;
  codigo: string;
  producto_id: number;
  producto: Producto;
  fecha_produccion: string;
  cantidad: number;
  observaciones: string | null;
  registrado_por_id: number;
  registrado_por: PersonalResumen;
  fecha_registro: string;
  activo: boolean;
}

export interface LoteProduccionCreate {
  producto_id: number;
  fecha_produccion: string;
  cantidad: number;
  observaciones?: string | null;
}

export interface LoteProduccionUpdate {
  producto_id?: number;
  fecha_produccion?: string;
  cantidad?: number;
  observaciones?: string | null;
  activo?: boolean;
}

export interface FiltrosLotesProduccion {
  productoId?: number | '';
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface PaginatedLotesProduccion {
  items: LoteProduccion[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
