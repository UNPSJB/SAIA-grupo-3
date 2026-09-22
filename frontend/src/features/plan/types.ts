import type { Tarea } from '../tarea';
import type { Personal } from '../personal';
import type { Sector } from '../sectores';
import type { Equipo } from '../equipos';

export type FrecuenciaPlan = 'diario' | 'semanal' | 'mensual';

export const FRECUENCIAS: { value: FrecuenciaPlan; label: string }[] = [
  { value: 'diario', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
];

export interface Plan {
  id?: number;
  nombre: string;
  frecuencia: FrecuenciaPlan;
  responsable_id: number;
  sector_id?: number | null;
  equipo_id?: number | null;
  activo?: boolean;
  tareas?: Tarea[];
  responsable?: Personal;
  sector?: Sector;
  equipo?: Equipo;
}

export interface PlanCreate {
  nombre: string;
  frecuencia: FrecuenciaPlan;
  responsable_id: number;
  sector_id?: number | null;
  equipo_id?: number | null;
  tarea_ids: number[];
}

export interface PaginatedPlanes {
  items: Plan[];
  total: number;
  page: number;
  size: number;
  pages: number;
}