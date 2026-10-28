import {
  API_BASE_URL,
  fetchWithAuth,
  mensajeDeRespuesta,
} from '../../shared/libreria/api';
import type {
  EstadoVencimiento,
  OrigenVencimiento,
  PaginatedVencimientosConsolidados,
} from './types';

export async function getVencimientosConsolidados(
  page: number,
  size: number,
  origen: OrigenVencimiento,
  estado: EstadoVencimiento | '',
  soloAlertas: boolean,
  buscar: string,
  ordenarPor: 'fecha_vencimiento' | 'elemento',
  orden: 'asc' | 'desc',
): Promise<PaginatedVencimientosConsolidados> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    origen,
    ordenar_por: ordenarPor,
    orden,
  });
  if (estado) params.set('estado', estado);
  if (soloAlertas) params.set('solo_alertas', 'true');
  if (buscar) params.set('buscar', buscar);
  const res = await fetchWithAuth(
    `${API_BASE_URL}/vencimientos/consolidados?${params}`,
  );
  if (!res.ok) {
    throw new Error(
      await mensajeDeRespuesta(res, 'No se pudieron obtener los vencimientos.'),
    );
  }
  return res.json();
}
