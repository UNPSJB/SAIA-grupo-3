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