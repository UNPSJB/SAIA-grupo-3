export type TipoEquipo = 'herramienta' | 'equipo' | 'instrumento';

export const TIPOS_EQUIPOS: { value: TipoEquipo; label: string }[] = [
  { value: 'herramienta', label: 'Herramienta' },
  { value: 'equipo', label: 'Equipo' },
  { value: 'instrumento', label: 'Instrumento' },
];

export interface Equipo {
  id?: number;
  numero_serie: string;
  nombre: string;
  tipo: TipoEquipo;
  sector_id: number;
  activo?: boolean;
  sector?: {           
    id: number;
    nombre: string;
  };
}