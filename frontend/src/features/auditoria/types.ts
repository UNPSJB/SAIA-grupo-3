export interface TareaRealizada {
  id: number;
  plan_realizado_id: number;
  tarea_origen_id?: number | null;
  nombre: string;
  frecuencia: string;
  procedimiento: string;
  fecha_registro: string;
  equipo_id?: number | null;
  elementos_utilizados?: { id: number; nombre: string }[] | null;
  insumos_utilizados?: { insumo_quimico_id: number; cantidad: number }[] | null;
}

export interface PlanRealizado {
  id: number;
  plan_origen_id?: number | null;
  nombre: string;
  descripcion: string;
  fecha_ejecucion: string;
  responsable_id: number;
  sector_id?: number | null;
  equipo_id?: number | null;
  tareas_realizadas: TareaRealizada[];
}

export interface PaginatedPlanesRealizados {
  items: PlanRealizado[];
  total: number;
  page: number;
  size: number;
  pages: number;
}