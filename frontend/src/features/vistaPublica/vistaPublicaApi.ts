import {
  API_BASE_URL,
  fetchWithAuth,
  mensajeDeRespuesta,
} from '../../shared/libreria/api';

import type { CodigoIndicador } from './indicadoresPublicos';

export type { CodigoIndicador } from './indicadoresPublicos';

export interface ConfiguracionVistaPublica {
  activa: boolean;
  token: string | null;
  enlace: string | null;
  fecha_actualizacion: string;
  indicadores_habilitados: CodigoIndicador[];
}

export interface IndicadorPublico {
  codigo: CodigoIndicador;
  titulo: string;
  porcentaje: number | null;
  valor: string | null;
  descripcion: string | null;
}

export interface VistaPublicaDatos {
  establecimiento: string;
  fecha_actualizacion: string;
  indicadores: IndicadorPublico[];
}

async function leerRespuesta<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(
      await mensajeDeRespuesta(
        response,
        'No se pudo completar la operación.',
      ),
    );
  }

  return response.json();
}

export async function getConfiguracionPublica() {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/vista-publica/configuracion`,
    { cache: 'no-store' },
  );

  return leerRespuesta<ConfiguracionVistaPublica>(response);
}

export async function cambiarIndicador(
  codigo: CodigoIndicador,
  habilitado: boolean,
) {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/vista-publica/indicadores`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, habilitado }),
    },
  );

  return leerRespuesta<ConfiguracionVistaPublica>(response);
}

export async function getPrevisualizacion() {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/vista-publica/previsualizacion`,
    { cache: 'no-store' },
  );

  return leerRespuesta<VistaPublicaDatos>(response);
}

export function urlEventosPublicos() {
  return `${API_BASE_URL}/publico/saia-publica/eventos`;
}

export async function cambiarEstadoPublicacion(activa: boolean) {
  const accion = activa ? 'activar' : 'desactivar';

  const response = await fetchWithAuth(
    `${API_BASE_URL}/vista-publica/${accion}`,
    { method: 'POST' },
  );

  return leerRespuesta<ConfiguracionVistaPublica>(response);
}
