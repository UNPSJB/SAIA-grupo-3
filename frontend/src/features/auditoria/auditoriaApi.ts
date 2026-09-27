import { API_BASE_URL } from '../../shared/libreria/api';
import type { PaginatedPlanesRealizados, PlanRealizado } from './types';

export async function getPlanesRealizados(page = 1, size = 10): Promise<PaginatedPlanesRealizados> {
  const res = await fetch(`${API_BASE_URL}/planes-realizados?page=${page}&size=${size}`);
  if (!res.ok) throw new Error('Error al obtener el historial de planes realizados.');
  return res.json();
}

export async function getPlanRealizadoById(id: number): Promise<PlanRealizado> {
  const res = await fetch(`${API_BASE_URL}/planes-realizados/${id}`);
  if (!res.ok) throw new Error('Error al obtener el detalle del plan.');
  return res.json();
}