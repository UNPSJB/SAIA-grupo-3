import { fetchWithAuth, mensajeDeError, API_BASE_URL } from '../../shared/libreria/api';
import type { PaginatedTiposIncidente, TipoIncidente, TipoIncidenteDatos } from './types';

const API_URL = `${API_BASE_URL}/tipos-incidente`;

export async function getTiposIncidente(
  page = 1,
  size = 10,
  mostrarInactivos = false,
  ordenarPor = 'id',
  orden = 'asc',
  buscar = '',
): Promise<PaginatedTiposIncidente> {
  let url = `${API_URL}?page=${page}&size=${size}&mostrar_inactivos=${mostrarInactivos}&ordenar_por=${ordenarPor}&orden=${orden}`;
  if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;

  const response = await fetchWithAuth(url);
  if (!response.ok) throw new Error('Error al obtener los tipos de incidente.');
  return response.json();
}

export async function createTipoIncidente(datos: { nombre: string; color: string }): Promise<TipoIncidente> {
  const response = await fetchWithAuth(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(mensajeDeError(errorData.detail, 'Error al crear el tipo de incidente.'));
  }
  return response.json();
}

export async function updateTipoIncidente(
  id: number,
  datos: TipoIncidenteDatos,
): Promise<TipoIncidente> {
  const response = await fetchWithAuth(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(mensajeDeError(errorData.detail, 'Error al actualizar el tipo de incidente.'));
  }
  return response.json();
}

export async function deleteTipoIncidente(id: number): Promise<void> {
  const response = await fetchWithAuth(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(mensajeDeError(errorData.detail, 'Error al dar de baja el tipo de incidente.'));
  }
}
