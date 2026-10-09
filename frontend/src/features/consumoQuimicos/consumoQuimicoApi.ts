import { API_BASE_URL, mensajeDeError, fetchWithAuth } from '../../shared/libreria/api';
import type { ConsumoQuimico } from './types';

export interface PaginatedConsumos {
  items: ConsumoQuimico[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ConsumoAcumulado {
  insumo_id: number;
  nombre_insumo: string;
  cantidad_total: number;
  unidad_medida: string;
}

export async function getReporteAcumulado(
  fechaDesde?: string,
  fechaHasta?: string,
  buscar = '',
  ordenarPor = 'nombre_insumo',
  orden = 'asc',
): Promise<ConsumoAcumulado[]> {
  const params = new URLSearchParams({ buscar, ordenar_por: ordenarPor, orden });
  if (fechaDesde) params.append('fecha_desde', fechaDesde);
  if (fechaHasta) params.append('fecha_hasta', fechaHasta);

  // Armamos la URL agregando los parámetros de fecha si existen
  const url = `${API_BASE_URL}/consumo-quimico/reporte/acumulado${params.toString() ? '?' + params.toString() : ''}`;

  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(mensajeDeError(errorData.detail, 'No se pudo obtener el reporte de consumo.'));
  }
  return res.json();
}

export async function getConsumos(
  page = 1,
  size = 10,
  mostrarInactivos = false,
  ordenarPor = 'fecha',
  orden = 'desc',
): Promise<PaginatedConsumos> {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/consumo-quimico?page=${page}&size=${size}&mostrar_inactivos=${mostrarInactivos}&ordenar_por=${ordenarPor}&orden=${orden}`,
  );
  if (!res.ok) throw new Error('No se pudo listar los consumos.');
  return res.json();
}

export async function createConsumo(data: ConsumoQuimico): Promise<ConsumoQuimico> {
  const res = await fetchWithAuth(`${API_BASE_URL}/consumo-quimico`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(mensajeDeError(e.detail, 'Error'));
  }
  return res.json();
}

export async function updateConsumo(id: number, data: ConsumoQuimico): Promise<ConsumoQuimico> {
  const res = await fetchWithAuth(`${API_BASE_URL}/consumo-quimico/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(mensajeDeError(e.detail, 'Error'));
  }
  return res.json();
}

export async function deleteConsumo(id: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}/consumo-quimico/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar');
}
export async function getConsumoById(id: number): Promise<ConsumoQuimico> {
  const response = await fetchWithAuth(`${API_BASE_URL}/consumo-quimico/${id}`);
  if (!response.ok) throw new Error('No se encontró el consumo.');
  return response.json();
}
