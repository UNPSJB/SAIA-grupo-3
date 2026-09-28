import type { InsumoQuimico } from '../insumosQuimicos/types';
import type { Personal } from '../personal/types';

export interface ConsumoQuimico {
  id?: number;
  insumo_quimico_id: number;
  cantidad_utilizada: number;
  fecha: string;
  tarea_limpieza: string;
  operario_id?: number;
  insumo?: InsumoQuimico;
  operario?: Personal;
  activo?: boolean
}