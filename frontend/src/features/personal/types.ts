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
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  nroLegajo: string;
  email: string;
  username: string;
  operar: boolean;
  administrar: boolean;
  activo: boolean;
  role_name: string;
  role_id: number;
  capacidades: string[];
}

export interface PersonalCreateInput {
  nombre: string;
  apellido: string;
  dni: string;
  nroLegajo: string;
  email: string;
  username: string;
  password: string;
  operar: boolean;
  administrar: boolean;
}

export type PersonalUpdateInput = Partial<PersonalCreateInput> & {
  password?: string;
  activo?: boolean;
};

// ---------- Vencimientos de documentación ----------

export type EstadoVencimiento = 'vencido' | 'por_vencer' | 'vigente';

export const ESTADOS_VENCIMIENTO: { value: EstadoVencimiento; label: string; variante: string }[] = [
  { value: 'vencido', label: 'Vencido', variante: 'danger' },
  { value: 'por_vencer', label: 'Por vencer', variante: 'warning' },
  { value: 'vigente', label: 'Vigente', variante: 'success' },
];

export interface EmpleadoResumen {
  id: number;
  dni: string;
  nroLegajo: string;
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
