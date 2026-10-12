import { API_BASE_URL, fetchWithAuth, mensajeDeError } from '../../shared/libreria/api';
import type { MovimientoIncidente } from './historialTypes';

export async function getHistorialIncidente(incidenteId: number): Promise<MovimientoIncidente[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/incidentes/${incidenteId}/movimientos`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      mensajeDeError(errorData.detail, 'No se pudo cargar el historial del incidente.'),
    );
  }
  return res.json();
}
