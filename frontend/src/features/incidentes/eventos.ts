import { avisarCambio } from '../../shared/libreria/eventos';

/** Se emite al crear, editar, eliminar, cerrar o reabrir un incidente. */
export const INCIDENTES_ACTUALIZADOS = 'saia:incidentes-actualizados';

export function avisarCambioIncidentes() {
  avisarCambio(INCIDENTES_ACTUALIZADOS);
}
