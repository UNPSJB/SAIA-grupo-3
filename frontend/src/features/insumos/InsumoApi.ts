import type { Insumo, InsumoCreate, InsumoUpdate } from './types';

const API_URL = 'http://localhost:8000/insumos';

export const getInsumos = async (): Promise<Insumo[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error('Error al obtener insumos');
  return response.json();
};

export const getInsumo = async (id: number): Promise<Insumo> => {
  const response = await fetch(`${API_URL}/${id}`);
  if (!response.ok) throw new Error('Error al obtener el insumo');
  return response.json();
};

export const createInsumo = async (insumo: InsumoCreate): Promise<Insumo> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(insumo),
  });
  if (!response.ok) throw new Error('Error al crear insumo');
  return response.json();
};

export const updateInsumo = async (id: number, insumo: InsumoUpdate): Promise<Insumo> => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(insumo),
  });
  if (!response.ok) throw new Error('Error al actualizar insumo');
  return response.json();
};

export const deleteInsumo = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error al eliminar insumo');
};