import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { CambioPassword, DocumentoPerfil, Perfil } from './types';

export async function getPerfil(): Promise<Perfil> {
  const res = await fetchWithAuth(`${API_BASE_URL}/perfil`);
  if (!res.ok) {
    throw new Error(await mensajeDeRespuesta(res, 'No se pudo obtener tu perfil.'));
  }
  return res.json();
}

export async function actualizarEmail(email: string): Promise<Perfil> {
  const res = await fetchWithAuth(`${API_BASE_URL}/perfil`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw new Error(await mensajeDeRespuesta(res, 'No se pudo actualizar el email.'));
  }
  return res.json();
}

export async function getMiDocumentacion(): Promise<DocumentoPerfil[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}/perfil/documentacion`);
  if (!res.ok) {
    throw new Error(await mensajeDeRespuesta(res, 'No se pudo obtener tu documentación.'));
  }
  return res.json();
}

export async function cambiarPassword(datos: CambioPassword): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}/perfil/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    throw new Error(await mensajeDeRespuesta(res, 'No se pudo cambiar la contraseña.'));
  }
}
