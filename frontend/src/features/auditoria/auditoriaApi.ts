import { API_BASE_URL, mensajeDeError } from '../../shared/libreria/api';
import type { PaginatedPlanesRealizados, PlanRealizado } from './types';

export async function getPlanesRealizados(page = 1, size = 10, desde = '', hasta = ''): Promise<PaginatedPlanesRealizados> {
  let url = `${API_BASE_URL}/planes-realizados?page=${page}&size=${size}`;
  if (desde) url += `&desde=${desde}`;
  if (hasta) url += `&hasta=${hasta}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(mensajeDeError(errorData.detail, 'Error al obtener el historial de planes realizados.'));
  }
  return res.json();
}

export async function getPlanRealizadoById(id: number): Promise<PlanRealizado> {
  const res = await fetch(`${API_BASE_URL}/planes-realizados/${id}`);
  if (!res.ok) throw new Error('Error al obtener el detalle del plan.');
  return res.json();
}