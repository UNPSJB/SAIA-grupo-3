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


export async function finalizarTareaApi(itemId: number, personalDni: number, imagen: File | null): Promise<void> {
  const formData = new FormData();
  formData.append('personal_dni', personalDni.toString());
  
  if (imagen) {
    formData.append('foto', imagen);
  }

  const res = await fetch(`${API_BASE_URL}/checklist/items/${itemId}/finalizar`, {
    method: 'POST',

    body: formData,
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'No se pudo finalizar la tarea.');
  }
}