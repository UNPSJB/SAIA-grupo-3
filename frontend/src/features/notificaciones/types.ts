export type TipoNotificacion = 'vencimiento_documentacion';

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  enlace?: string | null;
  fecha_creacion: string;
  leida: boolean;
}
