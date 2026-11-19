import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type {
  Borrador,
  BorradorDatos,
  Exportacion,
  ExportacionResumen,
  RotuloListado,
  VistaPrevia,
} from './types';

async function pedir<T>(ruta: string, porDefecto: string, opciones: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ruta}`, opciones);
  if (!res.ok) throw new Error(await mensajeDeRespuesta(res, porDefecto));
  return res.json();
}

export const listarRotulos = () =>
  pedir<RotuloListado[]>('/rotulos/', 'No se pudieron cargar los rótulos.');

export const getBorrador = (productoId: number) =>
  pedir<Borrador>(`/rotulos/productos/${productoId}`, 'No se pudo cargar el borrador de rótulo.');

export const getVistaPrevia = (productoId: number) =>
  pedir<VistaPrevia>(
    `/rotulos/productos/${productoId}/vista-previa`,
    'No se pudo armar la vista previa del rótulo.',
  );

export const crearBorrador = (productoId: number) =>
  pedir<Borrador>(`/rotulos/productos/${productoId}`, 'No se pudo crear el borrador.', {
    method: 'POST',
  });

export const confirmarAlergenos = (productoId: number) =>
  pedir<Borrador>(
    `/rotulos/productos/${productoId}/alergenos/confirmar`,
    'No se pudo confirmar la declaración de alérgenos.',
    { method: 'POST' },
  );

export const guardarBorrador = (productoId: number, datos: BorradorDatos) =>
  pedir<Borrador>(`/rotulos/productos/${productoId}`, 'No se pudo guardar el borrador.', {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

export const exportarRotulo = (productoId: number) =>
  pedir<Exportacion>(
    `/rotulos/productos/${productoId}/exportaciones`,
    'No se pudo exportar el rótulo.',
    {
      method: 'POST',
    },
  );

export const listarExportaciones = (productoId: number) =>
  pedir<ExportacionResumen[]>(
    `/rotulos/productos/${productoId}/exportaciones`,
    'No se pudo cargar el historial de exportaciones.',
  );

export const getExportacion = (exportacionId: number) =>
  pedir<Exportacion>(`/rotulos/exportaciones/${exportacionId}`, 'No se pudo abrir la exportación.');
