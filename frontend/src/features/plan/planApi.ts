import { API_BASE_URL, mensajeDeError } from '../../shared/libreria/api';
import type { Plan, PlanCreate, PlanUpdate, PaginatedPlanes } from './types';

export async function getPlanes(page = 1, size = 10, mostrarInactivos = false): Promise<PaginatedPlanes> {
  const res = await fetch(`${API_BASE_URL}/planes?page=${page}&size=${size}&mostrar_inactivos=${mostrarInactivos}`);
  if (!res.ok) throw new Error('No se pudo listar los planes.');
  return res.json();
}

export async function createPlan(data: PlanCreate): Promise<Plan> {
  const res = await fetch(`${API_BASE_URL}/planes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(mensajeDeError(errorData.detail, 'Error al registrar el plan.'));
  }
  return res.json();
}

export async function updatePlan(id: number, data: PlanUpdate): Promise<Plan> {
  const res = await fetch(`${API_BASE_URL}/planes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(mensajeDeError(errorData.detail, 'Error al actualizar el plan.'));
  }
  return res.json();
}

export async function deletePlan(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/planes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al dar de baja el plan');
}

export async function getPlanById(id: number): Promise<Plan> {
  const res = await fetch(`${API_BASE_URL}/planes/${id}`);
  if (!res.ok) throw new Error('Error al obtener el plan');
  return res.json();
}