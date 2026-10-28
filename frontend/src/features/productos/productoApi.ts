import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { PaginatedProductos, Producto, ProductoCreate, ProductoUpdate } from './types';

const API_URL = `${API_BASE_URL}/productos`;

export async function getProductos(
  page = 1,
  size = 10,
  mostrarInactivos = false,
  ordenarPor = 'nombre',
  orden = 'asc',
  buscar = '',
): Promise<PaginatedProductos> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    mostrar_inactivos: String(mostrarInactivos),
    ordenar_por: ordenarPor,
    orden,
  });
  if (buscar) params.set('buscar', buscar);
  const response = await fetchWithAuth(`${API_URL}/?${params}`);
  if (!response.ok)
    throw new Error(await mensajeDeRespuesta(response, 'Error al obtener los productos.'));
  return response.json();
}

export async function getProductosActivos(): Promise<Producto[]> {
  const response = await fetchWithAuth(`${API_URL}/activos`);
  if (!response.ok)
    throw new Error(await mensajeDeRespuesta(response, 'Error al obtener los productos.'));
  return response.json();
}

export async function getProductoById(id: number): Promise<Producto> {
  const response = await fetchWithAuth(`${API_URL}/${id}`);
  if (!response.ok)
    throw new Error(await mensajeDeRespuesta(response, 'No se encontró el producto.'));
  return response.json();
}

export async function createProducto(datos: ProductoCreate): Promise<Producto> {
  const response = await fetchWithAuth(`${API_URL}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!response.ok)
    throw new Error(await mensajeDeRespuesta(response, 'Error al crear el producto.'));
  return response.json();
}

export async function updateProducto(id: number, datos: ProductoUpdate): Promise<Producto> {
  const response = await fetchWithAuth(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!response.ok)
    throw new Error(await mensajeDeRespuesta(response, 'Error al actualizar el producto.'));
  return response.json();
}

export async function deleteProducto(id: number): Promise<Producto> {
  const response = await fetchWithAuth(`${API_URL}/${id}`, { method: 'DELETE' });
  if (!response.ok)
    throw new Error(await mensajeDeRespuesta(response, 'Error al dar de baja el producto.'));
  return response.json();
}
