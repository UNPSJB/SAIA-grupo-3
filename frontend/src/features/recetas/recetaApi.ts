import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type {
  InsumoDisponible,
  NuevaVersion,
  Receta,
  RecetaCreate,
  RecetaDeProducto,
  Version,
} from './types';

async function pedir<T>(ruta: string, porDefecto: string, opciones: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ruta}`, opciones);
  if (!res.ok) throw new Error(await mensajeDeRespuesta(res, porDefecto));
  return res.json();
}

export function listarRecetas(buscar = '', mostrarInactivos = false): Promise<RecetaDeProducto[]> {
  const params = new URLSearchParams({ buscar, mostrar_inactivos: String(mostrarInactivos) });
  return pedir(`/recetas/?${params}`, 'No se pudieron cargar las recetas.');
}

export const getReceta = (id: number) =>
  pedir<Receta>(`/recetas/${id}`, 'No se encontró la receta.');

export const getVersion = (id: number) =>
  pedir<Version>(`/recetas/versiones/${id}`, 'No se encontró la versión.');

export const getInsumosDisponibles = () =>
  pedir<InsumoDisponible[]>('/recetas/insumos-disponibles', 'No se pudieron cargar los insumos.');

export const crearReceta = (datos: RecetaCreate) =>
  pedir<Receta>('/recetas/', 'No se pudo crear la receta.', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

export const guardarNuevaVersion = (recetaId: number, datos: NuevaVersion) =>
  pedir<Receta>(`/recetas/${recetaId}/versiones`, 'No se pudo guardar la nueva versión.', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
