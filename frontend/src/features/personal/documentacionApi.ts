import { fetchWithAuth } from '../../shared/libreria/api';
import { API_BASE_URL, mensajeDeError } from '../../shared/libreria/api';
import type { Documento, EstadoVencimiento, PaginatedVencimientos } from './types';

export interface DocumentoDatos {
  tipo_documento_id: number;
  fecha_vencimiento: string;
}

async function mensajeError(res: Response, mensajePorDefecto: string): Promise<string> {
  const errorData = await res.json().catch(() => ({}));
  return mensajeDeError(errorData.detail, mensajePorDefecto);
}

export async function getDocumentosPersonal(personalId: number): Promise<Documento[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/documentos?personal_id=${personalId}`);
  if (!res.ok) {
    throw new Error(await mensajeError(res, 'No se pudieron obtener los documentos del personal.'));
  }
  return res.json();
}

export async function createDocumento(
  personalId: number,
  datos: DocumentoDatos
): Promise<Documento> {
  const res = await fetchWithAuth(`${API_BASE_URL}/documentos/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...datos, personal_id: personalId }),
  });
  if (!res.ok) {
    throw new Error(await mensajeError(res, 'Error al registrar el documento.'));
  }
  return res.json();
}

export async function updateDocumento(
  documentoId: number,
  datos: DocumentoDatos
): Promise<Documento> {
  const res = await fetchWithAuth(`${API_BASE_URL}/documentos/${documentoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    throw new Error(await mensajeError(res, 'Error al actualizar el documento.'));
  }
  return res.json();
}

export async function deleteDocumento(documentoId: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}/documentos/${documentoId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await mensajeError(res, 'No se pudo eliminar el documento.'));
  }
}

export async function getVencimientos(
  page = 1,
  size = 10,
  estado: EstadoVencimiento | '' = '',
  buscar = '',
  ordenarPor = 'fecha_vencimiento',
  orden = 'asc'
): Promise<PaginatedVencimientos> {
  let url = `${API_BASE_URL}/documentos/vencimientos?page=${page}&size=${size}&ordenar_por=${ordenarPor}&orden=${orden}`;
  if (estado) url += `&estado=${estado}`;
  if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;

  const res = await fetchWithAuth(url);
  if (!res.ok) {
    throw new Error(await mensajeError(res, 'No se pudo obtener el listado de vencimientos.'));
  }
  return res.json();
}
