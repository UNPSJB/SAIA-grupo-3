import type { EstadoVencimiento } from '../personal/types';

export interface Perfil {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  nroLegajo: string;
  email: string;
  username: string;
  operar: boolean;
  administrar: boolean;
}

export interface DocumentoPerfil {
  id: number;
  tipo_documento: { id: number; nombre: string; activo: boolean };
  fecha_vencimiento: string | null;
  estado: EstadoVencimiento | null;
  dias_restantes: number | null;
}

export interface CambioPassword {
  password_actual: string;
  password_nueva: string;
  confirmacion: string;
}

export const MINIMO_CARACTERES_PASSWORD = 8;
