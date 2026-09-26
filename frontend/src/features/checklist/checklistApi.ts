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


//-------

// Agrega esta función al final del archivo
export async function finalizarTareaApi(itemId: number, personalDni: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/checklist/items/${itemId}/finalizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personal_dni: personalDni }),
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(mensajeDeError(errorData.detail, 'No se pudo finalizar la tarea.'));
  }
}