import type { Producto } from '../productos/types';
export type EstadoLote = 'abierto' | 'cerrado';

export interface InsumoResumen {
  id: number;
  nombre: string;
  unidadMedidaObj: {
    id: number;
    tipo: string;
    sufijo: string;
  };
}

export interface InsumoSeleccionable extends InsumoResumen {
  cantidad: number;
}

export interface LoteInsumoCreate {
  insumo_id: number;
  cantidad_usada: number;
  lotes_recepcion: ConsumoRecepcionCreate[];
}

export interface ConsumoRecepcionCreate {
  lote_recepcion_id: number;
  cantidad: number;
}

export interface LoteRecepcionDisponible {
  id: number;
  numero_lote: string;
  proveedor_nombre: string;
  fecha_vencimiento: string;
  cantidad_disponible: number;
  es_vencimiento_proximo: boolean;
}

export interface LoteInsumo {
  insumo_id: number;
  insumo: InsumoResumen;
  cantidad_usada: number;
}

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
  insumos_asociados: LoteInsumo[];
  version_receta: { id: number; receta_id: number; numero: number } | null;
  factor_receta: number | null;
}

export interface PrecargaLote {
  recetaId: number;
  versionId: number;
  versionNumero: number;
  factor: number;
  productoId: number;
  productoNombre: string;
  cantidad: number | null;
  insumos: { insumoId: number; cantidad: number }[];
  sinPrecargar: string[];
}

export interface LoteProduccionCreate {
  producto_id: number;
  fecha_produccion: string;
  cantidad: number;
  observaciones?: string | null;
  insumos: LoteInsumoCreate[];
  version_receta_id?: number | null;
  factor_receta?: number | null;
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
