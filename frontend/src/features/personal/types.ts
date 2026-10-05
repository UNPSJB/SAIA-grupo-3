export type TipoCapacidad = 'administrar' | 'operar' | 'operar_administrar';

export const TIPOS_CAPACIDAD: { value: TipoCapacidad; label: string }[] = [
  { value: 'administrar', label: 'Administrar' },
  { value: 'operar', label: 'Operar' },
  { value: 'operar_administrar', label: 'Operar y Administrar' },
];

export type TipoDocumento =
  | 'carnet_manipulador'
  | 'libreta_sanitaria'
  | 'psicofisico'
  | 'certificado_salud'
  | 'capacitacion';

export const TIPOS_DOCUMENTO: { value: TipoDocumento; label: string }[] = [
  { value: 'carnet_manipulador', label: 'Carnet de manipulador' },
  { value: 'libreta_sanitaria', label: 'Libreta sanitaria' },
  { value: 'psicofisico', label: 'Apto psicofísico' },
  { value: 'certificado_salud', label: 'Certificado de salud' },
  { value: 'capacitacion', label: 'Capacitación' },
];

export interface Documento {
  id: number;
  nombre: string;
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