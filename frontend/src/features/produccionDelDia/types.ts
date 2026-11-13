export type EstadoPaso = 'pendiente' | 'realizado';
export type AccionPaso = 'realizado' | 'anulado';

export interface PersonaResumen {
  id: number;
  nombre: string;
  apellido: string;
}

export interface PasoLote {
  id: number;
  lote_id: number;
  orden: number;
  nombre: string;
  procedimiento: string;
  equipo: { id: number; nombre: string } | null;
  tiempo_minutos: number | null;
  temperatura_celsius: number | null;
  punto_control: boolean;
  estado: EstadoPaso;
  realizado_por: PersonaResumen | null;
  realizado_en: string | null;
  valor_medido: number | null;
  observacion: string | null;
  foto_path: string | null;
}

export interface MovimientoPaso {
  id: number;
  accion: AccionPaso;
  fecha_hora: string;
  personal: PersonaResumen;
  valor_medido: number | null;
  observacion: string | null;
  foto_path: string | null;
  motivo: string | null;
}

export interface PasoConMovimientos extends PasoLote {
  movimientos: MovimientoPaso[];
}

export interface LoteDelDia {
  id: number;
  codigo: string;
  producto: { id: number; nombre: string };
  fecha_produccion: string;
  cantidad: number;
  unidad: string;
  registrado_por: PersonaResumen;
  version_numero: number | null;
  receta_id: number | null;
  realizados: number;
  total: number;
  pasos: PasoLote[];
}

export interface DatosRealizarPaso {
  valorMedido: string;
  observacion: string;
  foto: File | null;
}
