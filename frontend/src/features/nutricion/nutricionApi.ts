import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type {
  AlimentoReferencia,
  DatosNutricionales,
  FuenteNutricional,
  MovimientoHistorial,
  Nutriente,
  ResultadoImportacion,
} from './types';

async function pedir<T>(ruta: string, porDefecto: string, opciones: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ruta}`, opciones);
  if (!res.ok) throw new Error(await mensajeDeRespuesta(res, porDefecto));
  return res.json();
}

export const getDatosNutricionales = (insumoId: number) =>
  pedir<DatosNutricionales>(
    `/nutricion/insumos/${insumoId}`,
    'No se pudieron cargar los datos nutricionales.',
  );

export const getHistorialNutricional = (insumoId: number) =>
  pedir<MovimientoHistorial[]>(
    `/nutricion/insumos/${insumoId}/historial`,
    'No se pudo cargar el historial.',
  );

export function buscarAlimentos(buscar: string, limite = 30): Promise<AlimentoReferencia[]> {
  const params = new URLSearchParams({ buscar, limite: String(limite) });
  return pedir(`/nutricion/alimentos?${params}`, 'No se pudieron buscar los alimentos.');
}

export const copiarDesdeReferencia = (insumoId: number, alimentoId: number) =>
  pedir<DatosNutricionales>(
    `/nutricion/insumos/${insumoId}/copiar-referencia`,
    'No se pudieron copiar los valores.',
    {
      method: 'POST',
      body: JSON.stringify({ alimento_referencia_id: alimentoId }),
    },
  );

export const cargarManual = (
  insumoId: number,
  fuente: FuenteNutricional,
  detalle: string,
  valores: Partial<Record<Nutriente, number | null>>,
) =>
  pedir<DatosNutricionales>(
    `/nutricion/insumos/${insumoId}`,
    'No se pudieron guardar los valores.',
    {
      method: 'PUT',
      body: JSON.stringify({ fuente, detalle_fuente: detalle || null, valores }),
    },
  );

export const modificarValor = (insumoId: number, nutriente: Nutriente, valor: number) =>
  pedir<DatosNutricionales>(
    `/nutricion/insumos/${insumoId}/valores`,
    'No se pudo modificar el valor.',
    {
      method: 'PATCH',
      body: JSON.stringify({ valores: { [nutriente]: valor } }),
    },
  );

export function importarAlimentos(archivo: File, fuente: string): Promise<ResultadoImportacion> {
  const formulario = new FormData();
  formulario.append('archivo', archivo);
  formulario.append('fuente', fuente);
  return pedir('/nutricion/alimentos/importar', 'No se pudo importar el archivo.', {
    method: 'POST',
    body: formulario,
  });
}
