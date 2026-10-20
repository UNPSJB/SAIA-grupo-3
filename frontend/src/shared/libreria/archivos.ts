import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from './api';

export const TAMANIO_MAXIMO_MB = 10;
export const FORMATOS_IMAGEN = '.jpg,.jpeg,.png,.webp';
export const FORMATOS_IMAGEN_Y_PDF = `${FORMATOS_IMAGEN},.pdf`;

export function validarArchivo(archivo: File | null, formatos: string): string | null {
  if (!archivo) return null;
  const permitidos = formatos.split(',');
  const extension = `.${archivo.name.split('.').pop()?.toLowerCase() ?? ''}`;
  if (!permitidos.includes(extension)) {
    const lista = permitidos.map((formato) => formato.replace('.', '').toUpperCase()).join(', ');
    return `Formato de archivo no permitido. Se aceptan: ${lista}.`;
  }
  if (archivo.size > TAMANIO_MAXIMO_MB * 1024 * 1024) {
    return `El archivo supera el tamaño máximo de ${TAMANIO_MAXIMO_MB} MB.`;
  }
  return null;
}

export async function obtenerArchivo(ruta: string): Promise<Blob> {
  const nombre = ruta.split('/').pop() ?? '';
  const res = await fetchWithAuth(`${API_BASE_URL}/archivos/${encodeURIComponent(nombre)}`);
  if (!res.ok) throw new Error(await mensajeDeRespuesta(res, 'No se pudo abrir el archivo.'));
  return res.blob();
}

export async function abrirArchivo(ruta: string): Promise<void> {
  const ventana = window.open('', '_blank');
  try {
    const url = URL.createObjectURL(await obtenerArchivo(ruta));
    if (ventana) ventana.location.href = url;
    else window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    ventana?.close();
    throw err;
  }
}
