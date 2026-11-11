import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type {
  AditivoReferencia,
  AditivoReferenciaDatos,
  ClaseFuncional,
  ClaseFuncionalDatos,
} from './types';

async function pedir<T>(ruta: string, porDefecto: string, opciones: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ruta}`, opciones);
  if (!res.ok) throw new Error(await mensajeDeRespuesta(res, porDefecto));
  return res.json();
}

export const getClaseFuncional = (id: number) =>
  pedir<ClaseFuncional>(`/clases-funcionales/${id}`, 'No se encontró la clase funcional.');

export const getClasesActivas = () =>
  pedir<ClaseFuncional[]>('/clases-funcionales/activas', 'No se pudieron cargar las clases.');

export const guardarClaseFuncional = (
  datos: Partial<ClaseFuncionalDatos> & { activo?: boolean },
  id?: number,
) =>
  pedir<ClaseFuncional>(
    id ? `/clases-funcionales/${id}` : '/clases-funcionales/',
    'No se pudo guardar la clase funcional.',
    { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) },
  );

export const bajaClaseFuncional = (id: number) =>
  pedir<ClaseFuncional>(`/clases-funcionales/${id}`, 'No se pudo dar de baja la clase.', {
    method: 'DELETE',
  });

export const getAditivo = (id: number) =>
  pedir<AditivoReferencia>(`/aditivos-referencia/${id}`, 'No se encontró el aditivo.');

export const getAditivosActivos = () =>
  pedir<AditivoReferencia[]>('/aditivos-referencia/activos', 'No se pudieron cargar los aditivos.');

export const guardarAditivo = (
  datos: Partial<AditivoReferenciaDatos> & { activo?: boolean },
  id?: number,
) =>
  pedir<AditivoReferencia>(
    id ? `/aditivos-referencia/${id}` : '/aditivos-referencia/',
    'No se pudo guardar el aditivo.',
    { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) },
  );

export const bajaAditivo = (id: number) =>
  pedir<AditivoReferencia>(`/aditivos-referencia/${id}`, 'No se pudo dar de baja el aditivo.', {
    method: 'DELETE',
  });

export function textoAditivo(aditivo: Pick<AditivoReferencia, 'nombre' | 'ins'>): string {
  return aditivo.ins ? `${aditivo.nombre} (INS ${aditivo.ins})` : aditivo.nombre;
}
