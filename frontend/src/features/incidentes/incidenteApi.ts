import { fetchWithAuth } from '../../shared/libreria/api';
import { API_BASE_URL, mensajeDeError } from '../../shared/libreria/api';
import type {
  CantidadPorTipo,
  EstadoIncidente,
  Incidente,
  IncidenteCreateInput,
  IncidenteUpdateInput,
  PaginatedIncidentes,
  PaginatedIncidentesAbiertos,
} from './types';

export async function getIncidentes(
  page = 1,
  size = 10,
  estado: EstadoIncidente | '' = '',
  fechaDesde = '',
  fechaHasta = '',
  tipoId: number | '' = '',
): Promise<PaginatedIncidentes> {
  let url = `${API_BASE_URL}/incidentes/?page=${page}&size=${size}`;
  if (estado) url += `&estado=${estado}`;
  if (fechaDesde) url += `&fecha_desde=${fechaDesde}`;
  if (fechaHasta) url += `&fecha_hasta=${fechaHasta}`;
  if (tipoId !== '') url += `&tipo_id=${tipoId}`;

  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(mensajeDeError(errorData.detail, 'No se pudieron cargar los incidentes.'));
  }
  return res.json();
}

export async function guardarIncidente(
  datos: IncidenteCreateInput | IncidenteUpdateInput,
  incidenteId?: number,
): Promise<Incidente> {
  const formData = new FormData();
  formData.append('descripcion', datos.descripcion);
  formData.append('tipo_id', String(datos.tipo_id));
  if (datos.foto) {
    formData.append('foto', datos.foto);
  }

  const res = await fetchWithAuth(
    incidenteId === undefined
      ? `${API_BASE_URL}/incidentes/`
      : `${API_BASE_URL}/incidentes/${incidenteId}`,
    {
      method: incidenteId === undefined ? 'POST' : 'PUT',
      body: formData,
    },
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(mensajeDeError(errorData.detail, 'No se pudo guardar el incidente.'));
  }
  return res.json();
}

export async function eliminarIncidente(incidenteId: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}/incidentes/${incidenteId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(mensajeDeError(errorData.detail, 'No se pudo eliminar el incidente.'));
  }
}

export async function getIncidenteById(id: number): Promise<Incidente> {
  const response = await fetchWithAuth(`${API_BASE_URL}/incidentes/${id}`);
  if (!response.ok) throw new Error('No se encontró el incidente.');
  return response.json();
}

export async function getIncidentesAbiertos(
  page = 1,
  size = 10,
  tipoId: number | '' = '',
  diasMinimos: number | '' = '',
  busqueda = '',
): Promise<PaginatedIncidentesAbiertos> {
  let url = `${API_BASE_URL}/incidentes/abiertos?page=${page}&size=${size}`;
  if (busqueda.trim()) url += `&buscar=${encodeURIComponent(busqueda.trim())}`;
  if (tipoId !== '') url += `&tipo_id=${tipoId}`;
  if (diasMinimos !== '') url += `&dias_minimos=${diasMinimos}`;

  const res = await fetchWithAuth(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      mensajeDeError(errorData.detail, 'No se pudieron cargar los incidentes abiertos.'),
    );
  }
  return res.json();
}

export async function getAbiertosPorTipo(): Promise<CantidadPorTipo[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/incidentes/abiertos/por-tipo`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(mensajeDeError(errorData.detail, 'No se pudo cargar el resumen por tipo.'));
  }
  return res.json();
}
