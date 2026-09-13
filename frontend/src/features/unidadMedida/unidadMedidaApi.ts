import type { UnidadMedida } from './types';

const API_URL = 'http://localhost:8000/unidadMedida';

export const getUnidadesMedida = async (): Promise<UnidadMedida[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error('Error al obtener las unidades de medida');
  return response.json();
};

export const createUnidadMedida = async (unidad: { tipo: string; sufijo: string }): Promise<UnidadMedida> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unidad),
  });
  if (!response.ok) throw new Error('Error al crear la unidad de medida');
  return response.json();
};

export const updateUnidadMedida = async (id: number, unidad: { tipo: string; sufijo: string }): Promise<UnidadMedida> => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unidad),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Error al actualizar la unidad de medida');
  }
  return response.json();
};

export const deleteUnidadMedida = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error al eliminar la unidad de medida');
};