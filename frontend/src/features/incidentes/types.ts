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

export type TipoIncidente = 'higiene' | 'plagas' | 'equipos' | 'producto';

export const TIPOS_INCIDENTE: { value: TipoIncidente; label: string }[] = [
  { value: 'higiene', label: 'Higiene y limpieza' },
  { value: 'plagas', label: 'Plagas' },
  { value: 'equipos', label: 'Equipos e instalaciones' },
  { value: 'producto', label: 'Producto / cliente' },
];

export const COLORES_INCIDENTE: Record<TipoIncidente, string> = {
  higiene: 'info',
  plagas: 'danger',
  equipos: 'primary',
  producto: 'success',
};

export function etiquetaTipoIncidente(tipo: TipoIncidente): string {
  return TIPOS_INCIDENTE.find((t) => t.value === tipo)?.label ?? tipo;
}

export interface Incidente {
  id: number;
  descripcion: string;
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
  tipo: TipoIncidente;
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
