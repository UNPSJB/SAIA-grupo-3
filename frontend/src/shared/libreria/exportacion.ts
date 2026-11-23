import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from './api';
import { fechaHoyIso } from './fechas';

export type ParametrosExportacion = Record<string, string | number | boolean | null | undefined>;

export function nombreArchivoListado(modulo: string): string {
  const limpio = modulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `listado-${limpio}-${fechaHoyIso()}`;
}

export async function obtenerDatosExportacion<T>(
  endpoint: string,
  parametros: ParametrosExportacion = {},
): Promise<T[]> {
  const query = new URLSearchParams();
  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      query.set(clave, String(valor));
    }
  });
  const ruta = endpoint.replace(/^\/+/, '');
  const url = `${API_BASE_URL}/exportacion/${ruta}${query.size ? `?${query}` : ''}`;
  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error(await mensajeDeRespuesta(res, 'No se pudo generar la exportación a PDF.'));
  }
  return res.json() as Promise<T[]>;
}