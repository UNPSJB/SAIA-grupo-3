import { API_BASE_URL } from '../../shared/libreria/api';
import type { Equipo } from './types';

export async function getEquipos(): Promise<Equipo[]> {
  const res = await fetch(`${API_BASE_URL}/equipos`);
  if (!res.ok) throw new Error('No se pudo listar los equipos.');
  return res.json();
}

export async function createEquipo(data: Equipo): Promise<Equipo> {
  const res = await fetch(`${API_BASE_URL}/equipos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error al registrar el equipo.');
  }
  return res.json();
}

export async function updateEquipo(id: number, data: Equipo): Promise<Equipo> {
  const res = await fetch(`${API_BASE_URL}/equipos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error al actualizar el equipo.');
  }
  return res.json();
}

export async function deleteEquipo(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/equipos/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'No se pudo eliminar el equipo.');
  }
}