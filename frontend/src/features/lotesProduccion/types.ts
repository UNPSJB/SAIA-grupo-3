import type { Producto } from '../productos/types';
export type EstadoLote = 'abierto' | 'cerrado';


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
  estado: EstadoLote;
  fecha_cierre: string | null;
  cerrado_por_id: number | null;
  cerrado_por: PersonalResumen | null;
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
