import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { AgrupacionCumplimiento, CumplimientoChecklist } from './types';

export async function getCumplimientoChecklist(
  fechaDesde: string,
  fechaHasta: string,
  agrupacion: AgrupacionCumplimiento,
): Promise<CumplimientoChecklist> {
  const params = new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, agrupacion });
  const res = await fetchWithAuth(`${API_BASE_URL}/tablero/cumplimiento-checklist?${params}`);
  if (!res.ok) {
    throw new Error(await mensajeDeRespuesta(res, 'No se pudo cargar el cumplimiento del checklist.'));
  }
  return res.json();
}
