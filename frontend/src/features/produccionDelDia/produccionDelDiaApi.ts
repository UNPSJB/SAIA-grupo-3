import { API_BASE_URL, fetchWithAuth, mensajeDeRespuesta } from '../../shared/libreria/api';
import type { DatosRealizarPaso, LoteDelDia, PasoConMovimientos, PasoLote } from './types';

async function pedir<T>(ruta: string, porDefecto: string, opciones: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ruta}`, opciones);
  if (!res.ok) throw new Error(await mensajeDeRespuesta(res, porDefecto));
  return res.json();
}

export const getProduccionDelDia = () =>
  pedir<LoteDelDia[]>('/produccion-del-dia', 'No se pudo cargar la producción del día.');

export const getPasosDelLote = (loteId: number) =>
  pedir<PasoConMovimientos[]>(
    `/produccion-del-dia/lotes/${loteId}/pasos`,
    'No se pudieron cargar los pasos del lote.',
  );

export function realizarPaso(pasoId: number, datos: DatosRealizarPaso): Promise<PasoLote> {
  const formulario = new FormData();
  if (datos.valorMedido.trim()) formulario.append('valor_medido', datos.valorMedido.trim());
  if (datos.observacion.trim()) formulario.append('observacion', datos.observacion.trim());
  if (datos.foto) formulario.append('foto', datos.foto);
  return pedir(`/produccion-del-dia/pasos/${pasoId}/realizar`, 'No se pudo marcar el paso.', {
    method: 'POST',
    body: formulario,
  });
}

export const anularPaso = (pasoId: number, motivo: string) =>
  pedir<PasoLote>(`/produccion-del-dia/pasos/${pasoId}/anular`, 'No se pudo anular el paso.', {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
