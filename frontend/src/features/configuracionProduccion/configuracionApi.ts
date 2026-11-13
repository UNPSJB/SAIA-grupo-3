import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';

export type FormatoAditivos = 'funcion_nombre' | 'funcion_ins' | 'funcion_nombre_ins';

export interface ConfiguracionProduccion {
  formato_aditivos: FormatoAditivos;
  actualizado_por: { id: number; nombre: string; apellido: string } | null;
  actualizado_en: string | null;
}

export async function getConfiguracion(): Promise<ConfiguracionProduccion> {
  const res = await fetchWithAuth(`${API_BASE_URL}/configuracion-produccion`);
  if (!res.ok)
    throw new Error(await mensajeDeRespuesta(res, 'No se pudo cargar la configuración.'));
  return res.json();
}

export async function actualizarConfiguracion(
  formato: FormatoAditivos,
): Promise<ConfiguracionProduccion> {
  const res = await fetchWithAuth(`${API_BASE_URL}/configuracion-produccion`, {
    method: 'PUT',
    body: JSON.stringify({ formato_aditivos: formato }),
  });
  if (!res.ok)
    throw new Error(await mensajeDeRespuesta(res, 'No se pudo guardar la configuración.'));
  return res.json();
}
