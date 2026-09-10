export type TipoEquipo = 'herramienta' | 'equipo' | 'instrumento';

export const TIPOS_EQUIPOS: { value: TipoEquipo; label: string }[] = [
  { value: 'herramienta', label: 'Herramienta' },
  { value: 'equipo', label: 'Equipo' },
  { value: 'instrumento', label: 'Instrumento' },
];

export interface Equipo {
  id?: number;
  nombre: string;
  tipo: TipoEquipo;
  ubicacion: string;
}