export type TipoCapacidad = 'administrar' | 'operar' | 'operar_administrar';

export const TIPOS_CAPACIDAD: { value: TipoCapacidad; label: string }[] = [
  { value: 'administrar', label: 'Administrar' },
  { value: 'operar', label: 'Operar' },
  { value: 'operar_administrar', label: 'Operar y Administrar' },
];

export interface TipoDocumento {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface Documento {
  id: number;
  tipo_documento_id: number;
  tipo_documento: TipoDocumento;
  fecha_vencimiento: string | null;
  personal_id: number;
  nombre_personal: string;
}

export interface Personal {
  dni: number;
  nroLegajo: number;
  nombre: string;
  apellido: string;
  tipo_capacidad: TipoCapacidad;
  email: string;
  activo?: boolean;
}

// ---------- Vencimientos de documentación ----------

export type EstadoVencimiento = 'vencido' | 'por_vencer' | 'vigente';

export const ESTADOS_VENCIMIENTO: { value: EstadoVencimiento; label: string; variante: string }[] = [
  { value: 'vencido', label: 'Vencido', variante: 'danger' },
  { value: 'por_vencer', label: 'Por vencer', variante: 'warning' },
  { value: 'vigente', label: 'Vigente', variante: 'success' },
];

export interface EmpleadoResumen {
  dni: number;
  nroLegajo: number;
  nombre: string;
  apellido: string;
}

export interface Vencimiento {
  id: number;
  fecha_vencimiento: string;
  tipo_documento: TipoDocumento;
  personal: EmpleadoResumen;
  estado: EstadoVencimiento;
  dias_restantes: number;
}

export interface PaginatedVencimientos {
  items: Vencimiento[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
