export type TipoCapacidad = 'administrar' | 'operar' | 'operar_administrar';

export const TIPOS_CAPACIDAD: { value: TipoCapacidad; label: string }[] = [
  { value: 'administrar', label: 'Administrar' },
  { value: 'operar', label: 'Operar' },
  { value: 'operar_administrar', label: 'Operar y Administrar' },
];

export interface Personal {
  dni: number;
  nroLegajo: number;
  nombre: string;
  apellido: string;
  tipo_capacidad: TipoCapacidad;
  email: string;
}