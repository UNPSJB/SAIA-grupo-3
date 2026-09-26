import type { FrecuenciaTarea } from '../tarea/types';

export type EstadoItem = 'pendiente' | 'realizada';

export interface PersonalResumen {
  dni: number;
  nombre: string;
  apellido: string;
}

export interface ItemChecklist {
  id: number;
  plan: { id: number; nombre: string };
  tarea: { id: number; nombre: string; procedimiento: string };
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
