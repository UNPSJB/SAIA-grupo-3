export type OrigenVencimiento = 'todos' | 'documentacion' | 'calibracion';
export type EstadoVencimiento = 'vencido' | 'por_vencer' | 'vigente';

export interface PersonalResumen {
  id: number;
  dni: string;
  nroLegajo: string;
  nombre: string;
  apellido: string;
}

export interface TipoDocumento {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface EquipoResumen {
  id: number;
  numero_serie: string;
  nombre: string;
  tipo: 'herramienta' | 'equipo' | 'instrumento';
}

export interface SectorResumen {
  id: number;
  nombre: string;
}

interface VencimientoBase {
  id: number;
  detalle_id: number;
  fecha_vencimiento: string;
  estado: EstadoVencimiento;
  dias_restantes: number;
}

export interface VencimientoDocumentacion extends VencimientoBase {
  origen: 'documentacion';
  tipo_documento: TipoDocumento;
  personal: PersonalResumen;
}

export interface VencimientoCalibracion extends VencimientoBase {
  origen: 'calibracion';
  fecha_ultima_calibracion: string;
  periodicidad_dias: number;
  equipo: EquipoResumen;
  sector: SectorResumen | null;
}

export type VencimientoConsolidado =
  | VencimientoDocumentacion
  | VencimientoCalibracion;

export interface PaginatedVencimientosConsolidados {
  items: VencimientoConsolidado[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
