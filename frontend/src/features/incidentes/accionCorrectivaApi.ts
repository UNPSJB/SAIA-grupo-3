import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { Incidente } from './types';
import type {
  AccionCorrectiva,
  AccionCorrectivaInput,
  ReaperturaInput,
} from './accionCorrectivaTypes';

export async function getAccionesCorrectivas(incidenteId: number): Promise<AccionCorrectiva[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/incidentes/${incidenteId}/acciones-correctivas`);
  if (!res.ok) {
    throw new Error(await mensajeDeRespuesta(res, 'No se pudieron cargar las acciones correctivas.'));
  }
  return res.json();
}

// Registra la acción correctiva y el backend cierra el incidente
export async function registrarAccionCorrectiva(
  incidenteId: number,
  datos: AccionCorrectivaInput,
): Promise<AccionCorrectiva> {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/incidentes/${incidenteId}/acciones-correctivas`,
    {
      method: 'POST',
      body: JSON.stringify(datos),
    },
  );
  if (!res.ok) {
    throw new Error(await mensajeDeRespuesta(res, 'No se pudo registrar la acción correctiva.'));
  }
  return res.json();
}

export async function modificarAccionCorrectiva(
  accionId: number,
  datos: AccionCorrectivaInput,
): Promise<AccionCorrectiva> {
  const res = await fetchWithAuth(`${API_BASE_URL}/incidentes/acciones-correctivas/${accionId}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    throw new Error(await mensajeDeRespuesta(res, 'No se pudo modificar la acción correctiva.'));
  }
  return res.json();
}

export async function reabrirIncidente(
  incidenteId: number,
  datos: ReaperturaInput,
): Promise<Incidente> {
  const res = await fetchWithAuth(`${API_BASE_URL}/incidentes/${incidenteId}/reabrir`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    throw new Error(await mensajeDeRespuesta(res, 'No se pudo reabrir el incidente.'));
  }
  return res.json();
}
