import { API_BASE_URL, fetchWithAuth, mensajeDeError } from '../../shared/libreria/api';
import type {
  DocumentoTecnico, DocumentoTecnicoDatos,
  PaginatedDocumentosTecnicos, TipoDocumentoTecnico, VersionDocumentoTecnico,
} from './types';

const URL_DOCUMENTOS = `${API_BASE_URL}/documentos-tecnicos`;

async function leerRespuesta<T>(res: Response, porDefecto: string): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(mensajeDeError(errorData.detail, porDefecto));
  }
  return res.json();
}

export async function getDocumentosTecnicos(
  page = 1,
  size = 10,
  tipo: TipoDocumentoTecnico | '' = '',
  busqueda = ''
): Promise<PaginatedDocumentosTecnicos> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (tipo) params.set('tipo', tipo);
  if (busqueda.trim()) params.set('busqueda', busqueda.trim());

  const res = await fetchWithAuth(`${URL_DOCUMENTOS}/?${params}`);
  return leerRespuesta(res, 'No se pudieron cargar los documentos técnicos.');
}


export async function getDocumentoTecnico(id: number): Promise<DocumentoTecnico> {
  const res = await fetchWithAuth(`${URL_DOCUMENTOS}/${id}`);
  return leerRespuesta(res, 'No se pudo cargar el documento.');
}

export async function crearDocumentoTecnico(
  datos: DocumentoTecnicoDatos, archivo: File
): Promise<DocumentoTecnico> {
  const formData = new FormData();
  formData.append('nombre', datos.nombre);
  formData.append('tipo', datos.tipo);
  if (datos.descripcion) formData.append('descripcion', datos.descripcion);
  formData.append('archivo', archivo);

  const res = await fetchWithAuth(`${URL_DOCUMENTOS}/`, { method: 'POST', body: formData });
  return leerRespuesta(res, 'No se pudo crear el documento.');
}

export async function actualizarDocumentoTecnico(
  id: number, datos: DocumentoTecnicoDatos
): Promise<DocumentoTecnico> {
  const res = await fetchWithAuth(`${URL_DOCUMENTOS}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
  return leerRespuesta(res, 'No se pudo actualizar el documento.');
}

export async function subirNuevaVersion(
  id: number, archivo: File, comentario: string
): Promise<DocumentoTecnico> {
  const formData = new FormData();
  formData.append('archivo', archivo);
  if (comentario.trim()) formData.append('comentario', comentario.trim());

  const res = await fetchWithAuth(`${URL_DOCUMENTOS}/${id}/versiones`, { method: 'POST', body: formData });
  return leerRespuesta(res, 'No se pudo subir la nueva versión.');
}

export async function descargarVersion(version: VersionDocumentoTecnico): Promise<void> {
  const res = await fetchWithAuth(`${URL_DOCUMENTOS}/versiones/${version.id}/archivo`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(mensajeDeError(errorData.detail, 'No se pudo descargar el archivo.'));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = version.nombre_original;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
