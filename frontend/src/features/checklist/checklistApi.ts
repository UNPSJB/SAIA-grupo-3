import { API_BASE_URL, mensajeDeError } from '../../shared/libreria/api';
import type { Checklist } from './types';

export async function getChecklistDelDia(personalDni: number): Promise<Checklist> {
  const res = await fetch(`${API_BASE_URL}/checklist/${personalDni}`);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(mensajeDeError(errorData.detail, 'No se pudo obtener el checklist.'));
  }
  return res.json();
}
