export type TipoNotificacion = 'vencimiento_documentacion' | 'stock_bajo';

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
