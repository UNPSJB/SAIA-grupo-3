import { API_BASE_URL } from '../../shared/libreria/api';
import type { InsumoQuimico, InsumoQuimicoCreate, InsumoQuimicoUpdate } from './types';

export interface PaginatedInsumosQuimicos {
  items: InsumoQuimico[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export async function getInsumosQuimicos(
  page = 1,
  size = 10,
  mostrarInactivos = false,
  ordenarPor = 'id',
  orden = 'asc',
  buscar = '',
  tipoQuimico = ''
): Promise<PaginatedInsumosQuimicos> {
  let url = `${API_BASE_URL}/insumos-quimicos?page=${page}&size=${size}&mostrar_inactivos=${mostrarInactivos}&ordenar_por=${ordenarPor}&orden=${orden}`;
  if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
  if (tipoQuimico) url += `&tipo_quimico=${encodeURIComponent(tipoQuimico)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo listar los insumos químicos.');
  return res.json();
}

export async function getInsumoQuimicoById(id: number): Promise<InsumoQuimico> {
  const res = await fetch(`${API_BASE_URL}/insumos-quimicos/${id}`);
  if (!res.ok) throw new Error('Error al obtener el insumo químico.');
  return res.json();
}

export async function createInsumoQuimico(data: InsumoQuimicoCreate): Promise<InsumoQuimico> {
  const res = await fetch(`${API_BASE_URL}/insumos-quimicos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error al registrar el insumo químico.');
  }
  return res.json();
}

export async function updateInsumoQuimico(id: number, data: InsumoQuimicoUpdate): Promise<InsumoQuimico> {
  const res = await fetch(`${API_BASE_URL}/insumos-quimicos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Error al actualizar el insumo químico.');
  }
  return res.json();
}

export async function deleteInsumoQuimico(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/insumos-quimicos/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'No se pudo dar de baja el insumo químico.');
  }
}