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
  fecha_ultima_calibracion?: string | null;
  periodicidad_dias?: number | null;
  sector?: {           
    id: number;
    nombre: string;
  };
}

// ---------- Registros de calibración ----------

export interface Calibracion {
  id: number;
  equipo_id: number;
  fecha_calibracion: string;
  otorgado_por: string;
  certificado_path: string;
  fecha_vencimiento_calculada: string | null;
  fecha_registro: string;
  activo: boolean;
}

export interface CalibracionInput {
  fecha_calibracion: string;
  otorgado_por: string;
  certificado?: File | null;
}

export function esCertificadoPdf(path: string): boolean {
  return path.toLowerCase().endsWith('.pdf');
}