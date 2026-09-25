import { API_BASE_URL } from '../../shared/libreria/api';
import type { Insumo, InsumoCreate, InsumoUpdate } from './types';

export interface PaginatedInsumos {
  items: Insumo[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const getInsumos = async (
  page = 1, size = 10, mostrarInactivos = false, ordenarPor = 'id', orden = 'asc', buscar = ''
): Promise<PaginatedInsumos> => {
  let url = `${API_BASE_URL}/insumos?page=${page}&size=${size}&mostrar_inactivos=${mostrarInactivos}&ordenar_por=${ordenarPor}&orden=${orden}`;
  if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Error al obtener insumos');
  return response.json();
};

export const getInsumo = async (id: number): Promise<Insumo> => {
  const response = await fetch(`${API_BASE_URL}/insumos/${id}`);
  if (!response.ok) throw new Error('Error al obtener el insumo');
  return response.json();
};

export const createInsumo = async (insumo: InsumoCreate): Promise<Insumo> => {
  const response = await fetch(`${API_BASE_URL}/insumos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(insumo),
  });
  if (!response.ok) throw new Error('Error al crear insumo');
  return response.json();
};

export const updateInsumo = async (id: number, insumo: InsumoUpdate): Promise<Insumo> => {
  const response = await fetch(`${API_BASE_URL}/insumos/${id}`, {
    method: 'PUT', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(insumo),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.detail) 
      ? errorData.detail[0].msg 
      : (errorData.detail || 'Error al actualizar insumo');
    throw new Error(msg);
  }
  
  return response.json();
};

export const deleteInsumo = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/insumos/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Error al eliminar insumo');
};