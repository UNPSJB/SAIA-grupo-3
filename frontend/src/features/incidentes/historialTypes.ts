export type AccionMovimientoIncidente = 'reportado' | 'cerrado' | 'reabierto';

export const ACCIONES_MOVIMIENTO_INCIDENTE: {
  value: AccionMovimientoIncidente;
  label: string;
  variante: string;
  icono: string;
  etiquetaMotivo: string;
}[] = [
  {
    value: 'reportado',
    label: 'Reportado',
    variante: 'secondary',
    icono: 'bi-flag-fill',
    etiquetaMotivo: '',
  },
  {
    value: 'cerrado',
    label: 'Cerrado',
    variante: 'success',
    icono: 'bi-check-circle-fill',
    etiquetaMotivo: 'Acción correctiva',
  },
  {
    value: 'reabierto',
    label: 'Reabierto',
    variante: 'warning',
    icono: 'bi-arrow-counterclockwise',
    etiquetaMotivo: 'Motivo',
  },
];

export interface MovimientoIncidente {
  id: number;
  incidente_id: number;
  accion: AccionMovimientoIncidente;
  fecha_hora: string;
  motivo: string | null;
  personal: {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
  };
}
