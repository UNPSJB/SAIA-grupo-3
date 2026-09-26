import type { Equipo } from '../equipos/types';
import type { Elemento } from '../elementos/types';
import type { InsumoQuimico } from '../insumosQuimicos/types';

export type FrecuenciaTarea = 'diaria' | 'semanal' | 'mensual';

export const FRECUENCIAS_TAREA: { value: FrecuenciaTarea; label: string }[] = [
  { value: 'diaria', label: 'Diaria' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
];

export interface TareaInsumoQuimico {
  insumo_quimico_id: number;
  cantidad: number;
  insumo_quimico?: InsumoQuimico;
}

export interface Tarea {
  id?: number;
  nombre: string;
  frecuencia: FrecuenciaTarea;
  procedimiento: string;
  equipo_id?: number | null;
  equipo?: Equipo;
  elementos?: Elemento[];
  insumos_quimicos?: TareaInsumoQuimico[];
}

export interface TareaCreate {
  nombre: string;
  frecuencia: FrecuenciaTarea;
  procedimiento: string;
  equipo_id?: number | null;
  elemento_ids: number[];
  insumos_quimicos: { insumo_quimico_id: number; cantidad: number }[];
}

export interface PaginatedTareas {
  items: Tarea[];
  total: number;
  page: number;
  size: number;
  pages: number;
}