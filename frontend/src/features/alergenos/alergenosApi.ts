import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { Alergeno, AlergenoDatos } from './types';

async function pedir<T>(ruta: string, porDefecto: string, opciones: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ruta}`, opciones);
  if (!res.ok) throw new Error(await mensajeDeRespuesta(res, porDefecto));
  return res.json();
}

export const listarAlergenos = (mostrarInactivos = false) =>
  pedir<Alergeno[]>(
    `/alergenos/${mostrarInactivos ? '?mostrar_inactivos=true' : ''}`,
    'No se pudieron cargar los alérgenos.',
  );

export const guardarAlergeno = (
  datos: Partial<AlergenoDatos> & { activo?: boolean },
  id?: number,
) =>
  pedir<Alergeno>(id ? `/alergenos/${id}` : '/alergenos/', 'No se pudo guardar el alérgeno.', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(datos),
  });

export const bajaAlergeno = (id: number) =>
  pedir<Alergeno>(`/alergenos/${id}`, 'No se pudo dar de baja el alérgeno.', { method: 'DELETE' });
