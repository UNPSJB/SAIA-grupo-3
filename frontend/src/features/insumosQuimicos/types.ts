import type { UnidadMedida } from '../unidadMedida/types';

export type TipoQuimico = 'detergente' | 'desinfectante' | 'desengrasante';

export const TIPOS_QUIMICOS: { value: TipoQuimico; label: string }[] = [
  { value: 'detergente', label: 'Detergente' },
  { value: 'desinfectante', label: 'Desinfectante' },
  { value: 'desengrasante', label: 'Desengrasante' },
];

export interface InsumoQuimico {
  id: number;
  nombre: string;
  cantidad: number;
  tipo_quimico: TipoQuimico;
  unidad_medida_id: number;
  activo: boolean;
  unidadMedidaObj?: UnidadMedida;
}

export interface InsumoQuimicoCreate {
  nombre: string;
  cantidad: number;
  tipo_quimico: TipoQuimico;
  unidad_medida_id: number;
}

export interface InsumoQuimicoUpdate {
  nombre?: string;
  cantidad?: number;
  tipo_quimico?: TipoQuimico;
  unidad_medida_id?: number;
  activo?: boolean;
}