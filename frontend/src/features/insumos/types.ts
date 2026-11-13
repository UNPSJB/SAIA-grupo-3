import type { AditivoReferencia } from '../aditivos/types';

export type TipoInsumo = 'ingrediente' | 'aditivo';

export interface Insumo {
  id: number;
  nombre: string;
  cantidad: number;
  stock_minimo?: number | null;
  stock_bajo?: boolean;
  unidad_medida_id: number;
  activo?: boolean;
  unidadMedidaObj?: {
    id: number;
    tipo: string;
    sufijo: string;
  };
  tipo?: TipoInsumo;
  aditivo_referencia_id?: number | null;
  aditivo_referencia?: AditivoReferencia | null;
  densidad_g_ml?: number | null;
  peso_unidad_g?: number | null;
}

export interface InsumoCreate {
  nombre: string;
  stock_minimo?: number | null;
  unidad_medida_id: number;
  tipo?: TipoInsumo;
  aditivo_referencia_id?: number | null;
  densidad_g_ml?: number | null;
  peso_unidad_g?: number | null;
}

export interface InsumoUpdate {
  nombre?: string;
  stock_minimo?: number | null;
  unidad_medida_id?: number;
  activo?: boolean;
}
