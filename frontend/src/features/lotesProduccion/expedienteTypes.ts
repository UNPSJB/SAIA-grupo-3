import type { InsumoTrazabilidad } from './trazabilidadTypes';
import type { LoteProduccion } from './types';

export type TipoAlerta =
  | 'punto_control_fuera_de_rango'
  | 'calibracion_vencida'
  | 'insumo_vencido'
  | 'insumo_recibido_despues'
  | 'insumo_sin_origen'
  | 'cierre_con_pasos_pendientes'
  | 'lote_anulado';

export interface AlertaExpediente {
  tipo: TipoAlerta;
  mensaje: string;
}

export interface MovimientoExpediente {
  accion: 'realizado' | 'anulado';
  fecha_hora: string;
  personal: string;
  valor_medido: number | null;
  observacion: string | null;
  motivo: string | null;
  con_foto: boolean;
}

export interface PasoExpediente {
  orden: number;
  nombre: string;
  equipo: string | null;
  punto_control: boolean;
  temperatura_esperada: number | null;
  valor_medido: number | null;
  estado: 'pendiente' | 'realizado';
  realizado_por: string | null;
  realizado_en: string | null;
  fuera_de_rango: boolean;
  movimientos: MovimientoExpediente[];
}

export interface TemperaturaExpediente {
  fecha_hora: string;
  temperatura: number;
  fuera_de_rango: boolean;
  operario: string;
}

export interface EquipoExpediente {
  equipo_id: number;
  nombre: string;
  pasos: number[];
  requiere_calibracion: boolean;
  fecha_calibracion: string | null;
  fecha_vencimiento: string | null;
  calibracion_vigente: boolean | null;
  temperaturas: TemperaturaExpediente[];
}

export interface IncidenteExpediente {
  id: number;
  fecha_hora: string;
  tipo: string;
  descripcion: string;
  estado: string;
  reportado_por: string;
}

export interface ExpedienteLote {
  lote: LoteProduccion;
  insumos: InsumoTrazabilidad[];
  pasos: PasoExpediente[];
  equipos: EquipoExpediente[];
  incidentes: IncidenteExpediente[];
  alertas: AlertaExpediente[];
}
