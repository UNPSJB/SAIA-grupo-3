import {
  API_BASE_URL,
  mensajeDeError,
  fetchWithAuth,
} from '../../shared/libreria/api';
import type { Checklist } from './types';

export interface ConsumoTareaInput {
  insumo_quimico_id: number;
  cantidad_utilizada: number;
}

export async function getChecklistDelDia(
  personalId: number,
): Promise<Checklist> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/checklist/${personalId}`,
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      mensajeDeError(
        errorData.detail,
        'No se pudo obtener el checklist.',
      ),
    );
  }

  return response.json();
}

export async function finalizarTareaApi(
  itemId: number,
  imagen: File | null,
  consumos: ConsumoTareaInput[],
): Promise<void> {
  const formData = new FormData();
    formData.append('consumos_json', JSON.stringify({ consumos }));

  if (imagen) {
    formData.append('foto', imagen);
  }

  const response = await fetchWithAuth(
    `${API_BASE_URL}/checklist/items/${itemId}/finalizar`,
    {
      method: 'POST',
      body: formData,
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      mensajeDeError(
        errorData.detail,
        'No se pudo finalizar la tarea.',
      ),
    );
  }
}