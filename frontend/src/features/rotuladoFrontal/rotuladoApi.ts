import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type {
  AplicabilidadDatos,
  AplicabilidadProducto,
  Conjunto,
  ConjuntoDatos,
  ConjuntoResumen,
  EntradaPrueba,
  ResultadoPrueba,
} from './types';

async function pedir<T>(ruta: string, porDefecto: string, opciones: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ruta}`, opciones);
  if (!res.ok) throw new Error(await mensajeDeRespuesta(res, porDefecto));
  return res.status === 204 ? (undefined as T) : res.json();
}

export const getEstadoRotulado = () =>
  pedir<{ activo: boolean }>('/rotulado-frontal/estado', 'No se pudo consultar el módulo.');

export const listarConjuntos = () =>
  pedir<ConjuntoResumen[]>('/rotulado-frontal/parametros', 'No se pudieron cargar los parámetros.');

export const getConjunto = (id: number) =>
  pedir<Conjunto>(
    `/rotulado-frontal/parametros/${id}`,
    'No se pudo cargar el conjunto de parámetros.',
  );

export const crearVersion = (motivo: string, versionBaseId?: number) =>
  pedir<Conjunto>('/rotulado-frontal/parametros', 'No se pudo crear la versión.', {
    method: 'POST',
    body: JSON.stringify({ motivo, version_base_id: versionBaseId ?? null }),
  });

export const guardarBorrador = (id: number, datos: ConjuntoDatos) =>
  pedir<Conjunto>(`/rotulado-frontal/parametros/${id}`, 'No se pudo guardar el borrador.', {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

export const publicarConjunto = (id: number) =>
  pedir<Conjunto>(
    `/rotulado-frontal/parametros/${id}/publicar`,
    'No se pudo publicar la versión.',
    {
      method: 'POST',
    },
  );

export const descartarBorrador = (id: number) =>
  pedir<void>(`/rotulado-frontal/parametros/${id}`, 'No se pudo descartar el borrador.', {
    method: 'DELETE',
  });

export const probarParametros = (entrada: EntradaPrueba, conjuntoId: number) =>
  pedir<ResultadoPrueba>(
    `/rotulado-frontal/parametros/probar?conjunto_id=${conjuntoId}`,
    'No se pudo probar el conjunto.',
    { method: 'POST', body: JSON.stringify(entrada) },
  );

export const getAplicabilidad = (productoId: number) =>
  pedir<AplicabilidadProducto>(
    `/rotulado-frontal/productos/${productoId}/aplicabilidad`,
    'No se pudo cargar el rotulado frontal del producto.',
  );

export const guardarAplicabilidad = (productoId: number, datos: AplicabilidadDatos) =>
  pedir<AplicabilidadProducto>(
    `/rotulado-frontal/productos/${productoId}/aplicabilidad`,
    'No se pudo evaluar el rotulado frontal.',
    { method: 'PUT', body: JSON.stringify(datos) },
  );
