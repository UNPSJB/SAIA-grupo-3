import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { Equipo } from '../equipos/types';

const API_URL = `${API_BASE_URL}/registros-temperatura`;

export interface RegistroTemperaturaCreate {
  equipo_id: number;
  temperatura_registrada: number;
  accion_tomada?: string | null;
}

export interface RegistroTemperatura {
  id: number;
  equipo_id: number;
  operario_id: number;
  temperatura_registrada: number;
  fecha_hora_registro: string;
  fuera_de_rango: boolean;
  accion_tomada: string | null;
  equipo: Equipo;
  operario: {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
    nroLegajo: string;
  };
}

export interface PaginatedRegistrosTemperatura {
  items: RegistroTemperatura[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export async function registrarTemperatura(datos: RegistroTemperaturaCreate): Promise<RegistroTemperatura> {
  const response = await fetchWithAuth(`${API_URL}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  
  if (!response.ok) {
    throw new Error(await mensajeDeRespuesta(response, 'Error al registrar la temperatura.'));
  }
  return response.json();
}

export async function getEquiposPendientesHoy(): Promise<Equipo[]> {
  const response = await fetchWithAuth(`${API_URL}/pendientes-hoy`);
  if (!response.ok) {
    throw new Error(await mensajeDeRespuesta(response, 'Error al cargar los equipos pendientes.'));
  }
  return response.json();
}

export async function getRegistrosTemperatura(
  equipoId?: number,
  fechaDesde?: string,
  fechaHasta?: string,
  soloAlertas: boolean = false,
  page: number = 1,
  size: number = 50
): Promise<PaginatedRegistrosTemperatura> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    solo_alertas: String(soloAlertas)
  });
  
  if (equipoId) params.set('equipo_id', String(equipoId));
  if (fechaDesde) params.set('fecha_desde', fechaDesde);
  if (fechaHasta) params.set('fecha_hasta', fechaHasta);

  const response = await fetchWithAuth(`${API_URL}/?${params}`);
  if (!response.ok) {
    throw new Error(await mensajeDeRespuesta(response, 'Error al listar el historial.'));
  }
  return response.json();
}