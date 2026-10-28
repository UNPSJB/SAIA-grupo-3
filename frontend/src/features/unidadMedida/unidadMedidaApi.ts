import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { UnidadMedida } from './types';

export async function getUnidadesMedidaActivas(): Promise<UnidadMedida[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/unidades-medida/activas`);
  if (!response.ok)
    throw new Error(await mensajeDeRespuesta(response, 'Error al obtener las unidades de medida.'));
  return response.json();
}
