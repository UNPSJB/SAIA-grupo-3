import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type {
  Composicion,
  Escalado,
  InsumoDisponible,
  ListaIngredientes,
  ModoEscalado,
  NuevaVersion,
  Receta,
  RecetaCreate,
  RecetaDeProducto,
  RecetaVigente,
  Version,
  VersionResumen,
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

export function listarRecetasVigentes(buscar = ''): Promise<RecetaVigente[]> {
  const params = new URLSearchParams({ buscar });
  return pedir(`/recetas/vigentes?${params}`, 'No se pudieron cargar las recetas vigentes.');
}

export const getVersiones = (recetaId: number) =>
  pedir<VersionResumen[]>(`/recetas/${recetaId}/versiones`, 'No se pudo cargar el historial.');

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

export function escalarReceta(
  recetaId: number,
  modo: ModoEscalado,
  valor: number,
): Promise<Escalado> {
  const params = new URLSearchParams({ [modo]: String(valor) });
  return pedir(`/recetas/${recetaId}/escalado?${params}`, 'No se pudo escalar la receta.');
}

export const getComposicion = (versionId: number) =>
  pedir<Composicion>(
    `/recetas/versiones/${versionId}/composicion`,
    'No se pudo calcular la composición.',
  );

export const getListaIngredientes = (versionId: number) =>
  pedir<ListaIngredientes>(
    `/recetas/versiones/${versionId}/lista-ingredientes`,
    'No se pudo armar la lista de ingredientes.',
  );

export const ajustarOrdenIngredientes = (versionId: number, renglonIds: number[]) =>
  pedir<ListaIngredientes>(
    `/recetas/versiones/${versionId}/orden-ingredientes`,
    'No se pudo guardar el orden.',
    {
      method: 'PUT',
      body: JSON.stringify({ renglon_ids: renglonIds }),
    },
  );

export const volverOrdenAutomatico = (versionId: number) =>
  pedir<ListaIngredientes>(
    `/recetas/versiones/${versionId}/orden-ingredientes`,
    'No se pudo volver al orden automático.',
    { method: 'DELETE' },
  );
