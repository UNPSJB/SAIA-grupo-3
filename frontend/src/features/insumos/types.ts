export interface Insumo {
  id: number;
  nombre: string;
  cantidad: number;
  unidad_medida_id: number;
  activo?: boolean;
  unidadMedidaObj?: {
    id: number;
    tipo: string;
    sufijo: string;
  };
}

export interface InsumoCreate {
  nombre: string;
  cantidad: number;
  unidad_medida_id: number;
}

export interface InsumoUpdate {
  nombre?: string;
  cantidad?: number;
  unidad_medida_id?: number;
  activo?: boolean;
}