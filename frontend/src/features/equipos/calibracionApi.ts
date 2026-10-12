import { fetchWithAuth } from '../../shared/libreria/api';
import { API_BASE_URL, mensajeDeError } from '../../shared/libreria/api';
import type {
  Calibracion,
  CalibracionInput,
  EstadoVencimientoCalibracion,
  PaginatedVencimientosCalibracion,
} from './types';

async function mensajeError(res: Response, mensajePorDefecto: string): Promise<string> {
  const errorData = await res.json().catch(() => ({}));
  return mensajeDeError(errorData.detail, mensajePorDefecto);
}

export async function getCalibracionesEquipo(equipoId: number): Promise<Calibracion[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/calibraciones/?equipo_id=${equipoId}`);
  if (!res.ok) {
    throw new Error(await mensajeError(res, 'No se pudieron obtener las calibraciones del equipo.'));
  }
  return res.json();
}

// Se envía como FormData (igual que incidentes) porque puede llevar el archivo de evidencia
export async function guardarCalibracion(
  equipoId: number,
  datos: CalibracionInput,
  calibracionId?: number
): Promise<Calibracion> {
  const formData = new FormData();
  if (calibracionId === undefined) {
    formData.append('equipo_id', String(equipoId));
  }
  formData.append('fecha_calibracion', datos.fecha_calibracion);
  formData.append('otorgado_por', datos.otorgado_por);
  if (datos.certificado) {
    formData.append('certificado', datos.certificado);
  }

  const res = await fetchWithAuth(
    calibracionId === undefined
      ? `${API_BASE_URL}/calibraciones/`
      : `${API_BASE_URL}/calibraciones/${calibracionId}`,
    {
      method: calibracionId === undefined ? 'POST' : 'PUT',
      body: formData,
    }
  );
  if (!res.ok) {
    throw new Error(await mensajeError(res, 'No se pudo guardar la calibración.'));
  }
  return res.json();
}

export async function eliminarCalibracion(calibracionId: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}/calibraciones/${calibracionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await mensajeError(res, 'No se pudo eliminar la calibración.'));
  }
}

export async function getVencimientosCalibracion(
  page = 1,
  size = 10,
  estado: EstadoVencimientoCalibracion | '' = '',
  buscar = '',
  ordenarPor = 'fecha_vencimiento',
  orden = 'asc'
): Promise<PaginatedVencimientosCalibracion> {
  let url = `${API_BASE_URL}/calibraciones/vencimientos?page=${page}&size=${size}&ordenar_por=${ordenarPor}&orden=${orden}`;
  if (estado) url += `&estado=${estado}`;
  if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;

  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error(await mensajeError(res, 'No se pudo obtener el listado de vencimientos de calibración.'));
  }
  return res.json();
}
