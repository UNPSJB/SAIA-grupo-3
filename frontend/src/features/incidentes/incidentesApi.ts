import { API_BASE_URL, mensajeDeError } from '../../shared/libreria/api';

export interface ReportanteIncidente {
  dni: number;
  nombre: string;
  apellido: string;
}

export interface Incidente {
  id: number;
  descripcion: string;
  fecha_hora: string;
  reportado_por_dni: number;
  reportado_por: ReportanteIncidente;
  imagen_path: string | null;
}

export interface PaginatedIncidentes {
  items: Incidente[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface IncidenteDatos {
  descripcion: string;
  reportadoPorDni?: number;
  foto?: File | null;
}

export async function getIncidentes(page = 1, size = 10): Promise<PaginatedIncidentes> {
  const res = await fetch(`${API_BASE_URL}/incidentes/?page=${page}&size=${size}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(mensajeDeError(errorData.detail, 'No se pudieron cargar los incidentes.'));
  }
  return res.json();
}

export async function guardarIncidente(datos: IncidenteDatos, incidenteId?: number): Promise<Incidente> {
  const formData = new FormData();
  formData.append('descripcion', datos.descripcion);
  if (datos.reportadoPorDni !== undefined) {
    formData.append('reportado_por_dni', datos.reportadoPorDni.toString());
  }
  if (datos.foto) {
    formData.append('foto', datos.foto);
  }

  const res = await fetch(
    incidenteId === undefined
      ? `${API_BASE_URL}/incidentes/`
      : `${API_BASE_URL}/incidentes/${incidenteId}`,
    {
      method: incidenteId === undefined ? 'POST' : 'PUT',
      body: formData,
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(mensajeDeError(errorData.detail, 'No se pudo guardar el incidente.'));
  }
  return res.json();
}

export async function eliminarIncidente(incidenteId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/incidentes/${incidenteId}`, { method: 'DELETE' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(mensajeDeError(errorData.detail, 'No se pudo eliminar el incidente.'));
  }
}
