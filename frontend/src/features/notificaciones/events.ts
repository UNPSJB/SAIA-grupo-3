export const NOTIFICACIONES_ACTUALIZADAS = 'saia:notificaciones-actualizadas';

export function avisarCambioNotificaciones() {
  window.dispatchEvent(new Event(NOTIFICACIONES_ACTUALIZADAS));
}
