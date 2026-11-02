import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { ConsumoRecepcion, LoteRecepcion, Pagina } from '../abastecimiento/types';
import type { TrazabilidadProduccion } from './trazabilidadTypes';

const API_LOTES_INSUMO = `${API_BASE_URL}/lotes-insumo`;
const API_LOTES_PRODUCCION = `${API_BASE_URL}/lotes-produccion`;

export async function buscarLotesRecepcion(
  busqueda: string,
  page = 1,
  size = 100,
): Promise<Pagina<LoteRecepcion>> {
  const params = new URLSearchParams({
    buscar: busqueda,
    page: String(page),
    size: String(size),
  });
  const response = await fetchWithAuth(`${API_LOTES_INSUMO}/?${params}`);
  if (!response.ok)
    throw new Error(
      await mensajeDeRespuesta(response, 'Error al buscar los lotes de insumo.'),
    );
  return response.json();
}

export async function getTrazabilidadLoteRecepcion(
  loteId: number,
): Promise<ConsumoRecepcion[]> {
  const response = await fetchWithAuth(`${API_LOTES_INSUMO}/${loteId}/trazabilidad`);
  if (!response.ok)
    throw new Error(
      await mensajeDeRespuesta(response, 'Error al consultar la trazabilidad del lote.'),
    );
  return response.json();
}

export async function getTrazabilidadProduccion(
  loteId: number,
): Promise<TrazabilidadProduccion> {
  const response = await fetchWithAuth(`${API_LOTES_PRODUCCION}/${loteId}/trazabilidad`);
  if (!response.ok)
    throw new Error(
      await mensajeDeRespuesta(response, 'Error al consultar la trazabilidad de producción.'),
    );
  return response.json();
}
