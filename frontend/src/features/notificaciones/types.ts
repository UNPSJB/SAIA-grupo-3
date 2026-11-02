export type TipoNotificacion = 'vencimiento_documentacion' | 'stock_bajo' | 'temperatura_fuera_rango';

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  enlace?: string | null;
  fecha_creacion: string;
  leida: boolean;
  resuelta: boolean;
}
