import type { FrecuenciaTarea, TareaInsumoQuimico } from '../tarea/types';

export type EstadoItem = 'pendiente' | 'realizada';

export interface PersonalResumen {
  id: number;
  dni: string;
  nombre: string;
  apellido: string;
}

export interface ItemChecklist {
  id: number;
  plan: {
    id: number;
    nombre: string;
  };
  tarea: {
    id: number;
    nombre: string;
    procedimiento: string;
    insumos_quimicos?: TareaInsumoQuimico[];
  };
  frecuencia: FrecuenciaTarea;
  periodo_inicio: string;
  periodo_fin: string;
  estado: EstadoItem;
  realizada_por?: PersonalResumen | null;
  realizada_en?: string | null;
  foto_path?: string | null;
}

export interface Checklist {
  fecha: string;
  responsable: PersonalResumen;
  items: ItemChecklist[];
  total: number;
  realizadas: number;
  pendientes: number;
}