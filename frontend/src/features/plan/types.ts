import type { Tarea } from '../tarea';
import type { Personal } from '../personal';
import type { Sector } from '../sectores';
import type { Equipo } from '../equipos';

export interface Plan {
  id?: number;
  nombre: string;
  descripcion: string;
  responsable_id: number;
  sector_id?: number | null;
  equipo_id?: number | null;
  activo?: boolean;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  tareas?: Tarea[];
  responsable?: Personal;
  sector?: Sector;
  equipo?: Equipo;
}

export interface PlanCreate {
  nombre: string;
  descripcion: string;
  responsable_id: number;
  sector_id?: number | null;
  equipo_id?: number | null;
  tarea_ids: number[];
}

export interface PlanUpdate {
  nombre?: string;
  descripcion?: string;
  responsable_id?: number;
  sector_id?: number | null;
  equipo_id?: number | null;
  tarea_ids?: number[];
  activo?: boolean;
}

export interface PaginatedPlanes {
  items: Plan[];
  total: number;
  page: number;
  size: number;
  pages: number;
}