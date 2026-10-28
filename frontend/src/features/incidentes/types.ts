import type { TipoIncidente } from '../tipoIncidente/types';
import type { AgrupacionPeriodo } from '../../shared/libreria/graficos';

export type { TipoIncidente };

export interface ReportanteIncidente {
  dni: string;
  nombre: string;
  apellido: string;
}

export type EstadoIncidente = 'abierto' | 'cerrado';

export const ESTADOS_INCIDENTE: { value: EstadoIncidente; label: string; variante: string }[] = [
  { value: 'abierto', label: 'Abierto', variante: 'warning' },
  { value: 'cerrado', label: 'Cerrado', variante: 'success' },
];

export interface Incidente {
  id: number;
  descripcion: string;
  tipo_id: number;
  tipo: TipoIncidente;
  fecha_hora: string;
  estado: EstadoIncidente;
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
  tipo_id: number;
  foto?: File | null;
}

export type IncidenteUpdateInput = IncidenteCreateInput;

export interface IncidenteAbierto extends Incidente {
  dias_abierto: number;
}

export interface PaginatedIncidentesAbiertos {
  items: IncidenteAbierto[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface CantidadPorTipo {
  tipo: TipoIncidente;
  cantidad: number;
}

// Estadísticas del listado de incidentes (E7).
export interface EstadisticaPorTipo {
  tipo: TipoIncidente;
  total: number;
  abiertos: number;
  cerrados: number;
}

export interface EstadisticaPorPeriodo {
  periodo: string;
  cantidad: number;
}

export interface EstadisticasIncidentes {
  fecha_desde: string;
  fecha_hasta: string;
  agrupacion: AgrupacionPeriodo;
  total: number;
  abiertos: number;
  cerrados: number;
  promedio_horas_resolucion: number | null;
  por_tipo: EstadisticaPorTipo[];
  evolucion: EstadisticaPorPeriodo[];
}
