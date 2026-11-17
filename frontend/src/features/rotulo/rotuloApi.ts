import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { Borrador, BorradorDatos, RotuloListado } from './types';

async function pedir<T>(ruta: string, porDefecto: string, opciones: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ruta}`, opciones);
  if (!res.ok) throw new Error(await mensajeDeRespuesta(res, porDefecto));
  return res.json();
}

export const listarRotulos = () =>
  pedir<RotuloListado[]>('/rotulos/', 'No se pudieron cargar los rótulos.');

export const getBorrador = (productoId: number) =>
  pedir<Borrador>(`/rotulos/productos/${productoId}`, 'No se pudo cargar el borrador de rótulo.');

export const crearBorrador = (productoId: number) =>
  pedir<Borrador>(`/rotulos/productos/${productoId}`, 'No se pudo crear el borrador.', {
    method: 'POST',
  });

export const guardarBorrador = (productoId: number, datos: BorradorDatos) =>
  pedir<Borrador>(`/rotulos/productos/${productoId}`, 'No se pudo guardar el borrador.', {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
