import { API_BASE_URL } from '../../shared/libreria/api';
import type { UnidadMedida } from './types';

const API_URL = `${API_BASE_URL}/unidadMedida`;

export interface PaginatedUnidades {
  items: UnidadMedida[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const getUnidadesMedida = async (
  page = 1, size = 10, mostrarInactivos = false, ordenarPor = 'id', orden = 'asc', buscar = ''
): Promise<PaginatedUnidades> => {
  let url = `${API_URL}?page=${page}&size=${size}&mostrar_inactivos=${mostrarInactivos}&ordenar_por=${ordenarPor}&orden=${orden}`;
  if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Error al obtener las unidades de medida');
  return response.json();
};

export const createUnidadMedida = async (unidad: { tipo: string; sufijo: string }): Promise<UnidadMedida> => {
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unidad),
    });
  } catch (err) {
    throw new Error('Ya existe un insumo con ese sufijo');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.detail) 
      ? errorData.detail[0].msg 
      : (errorData.detail || 'Error al crear la unidad de medida');
    throw new Error(msg);
  }
  
  return response.json();
};

export const updateUnidadMedida = async (id: number, unidad: { tipo?: string; sufijo?: string; activo?: boolean }): Promise<UnidadMedida> => {
  let response;
  try {
    response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unidad),
    });
  } catch (err) {
    throw new Error('Ya existe un insumo con ese sufijo');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.detail) 
      ? errorData.detail[0].msg 
      : (errorData.detail || 'Error al actualizar la unidad de medida');
    throw new Error(msg);
  }
  
  return response.json();
};

export const deleteUnidadMedida = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error al eliminar la unidad de medida');
};