import   { API_BASE_URL } from '../../shared/libreria/api'; 
import type { Personal } from './types';

export async function getPersonal(): Promise<Personal[]> {
  const res = await fetch(`${API_BASE_URL}/personal`);
  if (!res.ok) throw new Error('No se pudo listar el personal.');
  return res.json();
}

export async function createPersonal(data: Personal): Promise<Personal> {
  const res = await fetch(`${API_BASE_URL}/personal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error al registrar personal.');
  }
  return res.json();
}

export async function updatePersonal(dni: number, data: Personal): Promise<Personal> {
  const res = await fetch(`${API_BASE_URL}/personal/${dni}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error al actualizar personal.');
  }
  return res.json();
}

export async function deletePersonal(dni: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/personal/${dni}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'No se pudo eliminar el registro.');
  }
}