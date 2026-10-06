import { API_BASE_URL } from '../../shared/libreria/api';
import type {
  PaginatedTiposDocumento,
  TipoDocumento,
  TipoDocumentoDatos,
} from './types';

const API_URL = `${API_BASE_URL}/tipos-documento`;

export async function getTiposDocumento(
  page = 1,
  size = 10,
  mostrarInactivos = false,
  ordenarPor = 'id',
  orden = 'asc',
  buscar = ''
): Promise<PaginatedTiposDocumento> {
  let url = `${API_URL}?page=${page}&size=${size}&mostrar_inactivos=${mostrarInactivos}&ordenar_por=${ordenarPor}&orden=${orden}`;
  if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Error al obtener los tipos de documento.');
  return response.json();
}

export async function createTipoDocumento(
  datos: { nombre: string }
): Promise<TipoDocumento> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Error al crear el tipo de documento.');
  }
  return response.json();
}

export async function updateTipoDocumento(
  id: number,
  datos: TipoDocumentoDatos
): Promise<TipoDocumento> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Error al actualizar el tipo de documento.');
  }
  return response.json();
}

export async function deleteTipoDocumento(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Error al dar de baja el tipo de documento.');
  }
}
