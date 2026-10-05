import { API_BASE_URL, mensajeDeError } from '../../shared/libreria/api';
import type { Documento } from './types';

export interface DocumentoDatos {
  nombre: string;
  tipo_documento: Documento['tipo_documento'];
  fecha_vencimiento: string;
}

async function mensajeError(res: Response, mensajePorDefecto: string): Promise<string> {
  const errorData = await res.json();
  return mensajeDeError(errorData.detail, mensajePorDefecto);
}

export async function getDocumentosPersonal(personalId: number): Promise<Documento[]> {
  const res = await fetch(`${API_BASE_URL}/documentos?personal_id=${personalId}`);
  if (!res.ok) {
    throw new Error(await mensajeError(res, 'No se pudieron obtener los documentos del personal.'));
  }
  return res.json();
}

export async function createDocumento(
  personalId: number,
  datos: DocumentoDatos
): Promise<Documento> {
  const res = await fetch(`${API_BASE_URL}/documentos/`, {
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
  const res = await fetch(`${API_BASE_URL}/documentos/${documentoId}`, {
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
  const res = await fetch(`${API_BASE_URL}/documentos/${documentoId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await mensajeError(res, 'No se pudo eliminar el documento.'));
  }
}
