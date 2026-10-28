export type AgrupacionCumplimiento = 'dia' | 'semana';

export interface PuntoCumplimiento {
  inicio: string;
  fin: string;
  total: number;
  realizadas: number;
  porcentaje: number | null;
}

export interface CumplimientoChecklist {
  agrupacion: AgrupacionCumplimiento;
  desde: string;
  hasta: string;
  primera_fecha: string | null;
  total: number;
  realizadas: number;
  porcentaje: number | null;
  puntos: PuntoCumplimiento[];
}
