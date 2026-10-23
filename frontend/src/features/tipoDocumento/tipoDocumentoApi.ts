import {
  API_BASE_URL,
  fetchWithAuth,
  mensajeDeRespuesta,
} from '../../shared/libreria/api';
import type { PaginatedTiposDocumento } from './types';

const API_URL = `${API_BASE_URL}/tipos-documento`;

export async function getTiposDocumento(
  page = 1,
  size = 10,
  mostrarInactivos = false,
  ordenarPor = 'id',
  orden = 'asc',
  buscar = '',
): Promise<PaginatedTiposDocumento> {
  let url = `${API_URL}?page=${page}&size=${size}&mostrar_inactivos=${mostrarInactivos}&ordenar_por=${ordenarPor}&orden=${orden}`;

  if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;

  const response = await fetchWithAuth(url);

  if (!response.ok) {
    throw new Error(
      await mensajeDeRespuesta(
        response,
        'Error al obtener los tipos de documento.',
      ),
    );
  }

  return response.json();
}