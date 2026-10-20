import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { UnidadMedida } from './types';

const API_URL = `${API_BASE_URL}/unidades-medida`;

export interface PaginatedUnidades {
  items: UnidadMedida[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const getUnidadesMedida = async (
  page = 1,
  size = 10,
  mostrarInactivos = false,
  ordenarPor = 'id',
  orden = 'asc',
  buscar = '',
): Promise<PaginatedUnidades> => {
  let url = `${API_URL}?page=${page}&size=${size}&mostrar_inactivos=${mostrarInactivos}&ordenar_por=${ordenarPor}&orden=${orden}`;
  if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;

  const response = await fetchWithAuth(url);
  if (!response.ok) throw new Error(await mensajeDeRespuesta(response, 'Error al obtener las unidades de medida'));
  return response.json();
};

export const createUnidadMedida = async (unidad: {
  tipo: string;
  sufijo: string;
}): Promise<UnidadMedida> => {
  const response = await fetchWithAuth(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unidad),
  });

  if (!response.ok) throw new Error(await mensajeDeRespuesta(response, 'Error al crear la unidad de medida'));


  return response.json();
};

export const updateUnidadMedida = async (
  id: number,
  unidad: { tipo?: string; sufijo?: string; activo?: boolean },
): Promise<UnidadMedida> => {
  const response = await fetchWithAuth(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unidad),
  });

  if (!response.ok) throw new Error(await mensajeDeRespuesta(response, 'Error al actualizar la unidad de medida'));


  return response.json();
};

export const deleteUnidadMedida = async (id: number): Promise<void> => {
  const response = await fetchWithAuth(`${API_URL}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(await mensajeDeRespuesta(response, 'Error al eliminar la unidad de medida'));
};
