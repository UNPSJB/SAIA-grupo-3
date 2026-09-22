import { API_BASE_URL } from '../../shared/libreria/api';
import type { Sector } from './types';

export interface PaginatedSectores {
  items: Sector[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export async function getSectores(
  page = 1, 
  size = 10, 
  mostrarInactivos = false,
  ordenarPor = 'id',
  orden = 'asc',
  buscar = ''
): Promise<PaginatedSectores> {
  let url = `${API_BASE_URL}/sectores?page=${page}&size=${size}&mostrar_inactivos=${mostrarInactivos}&ordenar_por=${ordenarPor}&orden=${orden}`;
  
  if (buscar) {
    url += `&buscar=${encodeURIComponent(buscar)}`;
  }
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo listar los sectores.');
  return res.json();
}

export async function createSector(data: Sector): Promise<Sector> {
  const res = await fetch(`${API_BASE_URL}/sectores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error al registrar el sector.');
  }
  return res.json();
}

export async function updateSector(id: number, data: Sector): Promise<Sector> {
  const res = await fetch(`${API_BASE_URL}/sectores/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error al actualizar el sector.');
  }
  return res.json();
}

export async function deleteSector(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/sectores/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'No se pudo dar de baja el sector.');
  }
}

export async function getSectorById(id: number): Promise<Sector> {
  const res = await fetch(`${API_BASE_URL}/sectores/${id}`);
  if (!res.ok) throw new Error('Error al obtener el detalle del sector');
  return res.json();
}