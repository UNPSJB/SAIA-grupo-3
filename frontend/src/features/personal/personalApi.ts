import {
  API_BASE_URL,
  mensajeDeError,
  fetchWithAuth,
} from '../../shared/libreria/api';
import type {
  Personal,
  PersonalCreateInput,
  PersonalUpdateInput,
} from './types';

export interface PaginatedPersonal {
  items: Personal[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export async function getPersonal(
  page = 1,
  size = 10,
  mostrarInactivos = false
): Promise<PaginatedPersonal> {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/personal?page=${page}&size=${size}&mostrar_inactivos=${mostrarInactivos}`
  );

  if (!res.ok) {
    throw new Error('No se pudo listar el personal.');
  }

  return res.json();
}

export async function createPersonal(
  data: PersonalCreateInput
): Promise<Personal> {
  const res = await fetchWithAuth(`${API_BASE_URL}/personal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(
      mensajeDeError(errorData.detail, 'Error al registrar personal.')
    );
  }

  return res.json();
}

export async function updatePersonal(
  id: number,
  data: PersonalUpdateInput
): Promise<Personal> {
  const res = await fetchWithAuth(`${API_BASE_URL}/personal/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(
      mensajeDeError(errorData.detail, 'Error al actualizar personal.')
    );
  }

  return res.json();
}

export async function deletePersonal(id: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}/personal/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(
      errorData.detail || 'No se pudo dar de baja el registro.'
    );
  }
}