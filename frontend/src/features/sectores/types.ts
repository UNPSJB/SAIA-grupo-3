import type { Equipo } from '../equipos/types';

export interface Sector {
  id?: number;
  nombre: string;
  activo?: boolean;
  equipos?: Equipo[];
}