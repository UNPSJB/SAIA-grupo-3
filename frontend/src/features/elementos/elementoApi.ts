import { API_BASE_URL } from '../../shared/libreria/api';
import type { Elemento } from './types';

export interface PaginatedElementos {
  items: Elemento[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export async function getElementos(
  page = 1, 
  size = 10, 
  mostrarInactivos = false,
  ordenarPor = 'id',
  orden = 'asc'
): Promise<PaginatedElementos> {
  const res = await fetch(`${API_BASE_URL}/elementos?page=${page}&size=${size}&mostrar_inactivos=${mostrarInactivos}&ordenar_por=${ordenarPor}&orden=${orden}`);
  if (!res.ok) throw new Error('No se pudo listar los elementos.');
  return res.json();
}

export async function createElemento(data: Elemento): Promise<Elemento> {
  const res = await fetch(`${API_BASE_URL}/elementos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error al registrar el elemento.');
  }
  return res.json();
}

export async function updateElemento(id: number, data: Elemento): Promise<Elemento> {
  const res = await fetch(`${API_BASE_URL}/elementos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error al actualizar el elemento.');
  }
  return res.json();
}

export async function deleteElemento(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/elementos/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'No se pudo dar de baja el elemento.');
  }
}