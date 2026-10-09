export interface ReportanteIncidente {
  dni: string;
  nombre: string;
  apellido: string;
}

export interface Incidente {
  id: number;
  descripcion: string;
  fecha_hora: string;
  reportado_por_dni: string;
  reportado_por: ReportanteIncidente;
  imagen_path: string | null;
}

export interface PaginatedIncidentes {
  items: Incidente[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface IncidenteCreateInput {
  descripcion: string;
  foto?: File | null;
}

export type IncidenteUpdateInput = IncidenteCreateInput;
