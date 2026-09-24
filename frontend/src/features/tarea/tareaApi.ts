import { API_BASE_URL } from '../../shared/libreria/api';
import type { Tarea, TareaCreate, PaginatedTareas } from './types';

export async function getTareas(page = 1, size = 10): Promise<PaginatedTareas> {
  const res = await fetch(`${API_BASE_URL}/tareas?page=${page}&size=${size}`);
  if (!res.ok) throw new Error('No se pudo listar las tareas.');
  return res.json();
}

export async function createTarea(data: TareaCreate): Promise<Tarea> {
  const res = await fetch(`${API_BASE_URL}/tareas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error al registrar la tarea.');
  }
  return res.json();
}

export async function updateTarea(id: number, data: Partial<TareaCreate>): Promise<Tarea> {
  const res = await fetch(`${API_BASE_URL}/tareas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error al actualizar la tarea.');
  }
  return res.json();
}

export async function deleteTarea(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/tareas/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'No se pudo eliminar la tarea.');
  }
}