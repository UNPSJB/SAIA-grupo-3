import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { ExpedienteLote } from './expedienteTypes';
import type {
  FiltrosLotesProduccion,
  InsumoSeleccionable,
  LoteProduccion,
  LoteProduccionCreate,
  LoteProduccionUpdate,
  LoteRecepcionDisponible,
  PaginatedLotesProduccion,
} from './types';

const API_URL = `${API_BASE_URL}/lotes-produccion`;

export async function getLotesProduccion(
  page = 1,
  size = 10,
  filtros: FiltrosLotesProduccion = {},
  ordenarPor = 'fecha_produccion',
  orden = 'desc',
  buscar = '',
): Promise<PaginatedLotesProduccion> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    ordenar_por: ordenarPor,
    orden,
  });
  if (buscar) params.set('buscar', buscar);
  if (filtros.productoId) params.set('producto_id', String(filtros.productoId));
  if (filtros.fechaDesde) params.set('fecha_desde', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('fecha_hasta', filtros.fechaHasta);
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.incluirAnulados) params.set('incluir_anulados', 'true');
  const response = await fetchWithAuth(`${API_URL}/?${params}`);
  if (!response.ok)
    throw new Error(
      await mensajeDeRespuesta(response, 'Error al obtener los lotes de producción.'),
    );
  return response.json();
}

export async function getLoteProduccionById(id: number): Promise<LoteProduccion> {
  const response = await fetchWithAuth(`${API_URL}/${id}`);
  if (!response.ok)
    throw new Error(await mensajeDeRespuesta(response, 'No se encontró el lote de producción.'));
  return response.json();
}

export async function getInsumosDisponibles(): Promise<InsumoSeleccionable[]> {
  const response = await fetchWithAuth(`${API_URL}/insumos-disponibles`);
  if (!response.ok)
    throw new Error(
      await mensajeDeRespuesta(response, 'Error al obtener los insumos disponibles.'),
    );
  return response.json();
}

export async function getLotesDisponibles(
  insumoId: number,
  fechaProduccion: string,
): Promise<LoteRecepcionDisponible[]> {
  const params = new URLSearchParams({ fecha_produccion: fechaProduccion });
  const response = await fetchWithAuth(
    `${API_URL}/insumos/${insumoId}/lotes-disponibles?${params}`,
  );
  if (!response.ok)
    throw new Error(
      await mensajeDeRespuesta(response, 'Error al obtener las recepciones disponibles.'),
    );
  return response.json();
}

export async function createLoteProduccion(datos: LoteProduccionCreate): Promise<LoteProduccion> {
  const response = await fetchWithAuth(`${API_URL}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!response.ok)
    throw new Error(
      await mensajeDeRespuesta(response, 'Error al registrar el lote de producción.'),
    );
  return response.json();
}

export async function updateLoteProduccion(
  id: number,
  datos: LoteProduccionUpdate,
): Promise<LoteProduccion> {
  const response = await fetchWithAuth(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!response.ok)
    throw new Error(
      await mensajeDeRespuesta(response, 'Error al actualizar el lote de producción.'),
    );
  return response.json();
}

export async function deleteLoteProduccion(id: number): Promise<LoteProduccion> {
  const response = await fetchWithAuth(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!response.ok)
    throw new Error(
      await mensajeDeRespuesta(response, 'Error al dar de baja el lote de producción.'),
    );
  return response.json();
}


export async function cerrarLoteProduccion(id: number): Promise<LoteProduccion> {
  const response = await fetchWithAuth(`${API_URL}/${id}/cerrar`, { method: 'POST' });
  if (!response.ok)
    throw new Error(await mensajeDeRespuesta(response, 'Error al cerrar el lote de producción.'));
  return response.json();
}

export async function anularLoteProduccion(id: number, motivo: string): Promise<LoteProduccion> {
  const response = await fetchWithAuth(`${API_URL}/${id}/anular`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo }),
  });
  if (!response.ok)
    throw new Error(await mensajeDeRespuesta(response, 'Error al anular el lote de producción.'));
  return response.json();
}

export async function buscarLotePorCodigo(codigo: string): Promise<LoteProduccion> {
  const params = new URLSearchParams({ codigo });
  const response = await fetchWithAuth(`${API_URL}/buscar?${params}`);
  if (!response.ok)
    throw new Error(await mensajeDeRespuesta(response, 'No se pudo buscar el lote.'));
  return response.json();
}

export async function getExpedienteLote(id: number): Promise<ExpedienteLote> {
  const response = await fetchWithAuth(`${API_URL}/${id}/expediente`);
  if (!response.ok)
    throw new Error(
      await mensajeDeRespuesta(response, 'No se pudo obtener el expediente del lote.'),
    );
  return response.json();
}
