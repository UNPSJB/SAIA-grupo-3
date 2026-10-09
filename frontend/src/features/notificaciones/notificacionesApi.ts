import { fetchWithAuth, mensajeDeError, API_BASE_URL } from '../../shared/libreria/api';
import type { Notificacion } from './types';

async function manejarRespuesta<T>(res: Response, porDefecto: string): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(mensajeDeError(errorData.detail, porDefecto));
  }
  return res.json();
}

export async function getNotificaciones(limite = 20): Promise<Notificacion[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/notificaciones/?limite=${limite}`);
  return manejarRespuesta(res, 'No se pudieron obtener las notificaciones.');
}

export async function getCantidadNoLeidas(): Promise<number> {
  const res = await fetchWithAuth(`${API_BASE_URL}/notificaciones/no-leidas/cantidad`);
  const data = await manejarRespuesta<{ cantidad: number }>(res, 'No se pudo obtener la cantidad.');
  return data.cantidad;
}

export async function marcarNotificacionLeida(id: number): Promise<Notificacion> {
  const res = await fetchWithAuth(`${API_BASE_URL}/notificaciones/${id}/leer`, { method: 'PATCH' });
  return manejarRespuesta(res, 'No se pudo marcar como leída.');
}

export async function marcarTodasLeidas(): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}/notificaciones/leer-todas`, { method: 'PATCH' });
  await manejarRespuesta(res, 'No se pudieron marcar como leídas.');
}
