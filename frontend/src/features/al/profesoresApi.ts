import { API_BASE_URL } from '../../shared/lib/api';
import type { Profesor } from './types';

// export async function getProfesores(): Promise<Profesor[]> {
//   const res = await fetch(`${API_BASE_URL}/profesores`);
//   if (!res.ok) throw new Error('No se pudo listar profesores.');
//   return res.json();
// }

export async function createProfesor(data: Omit<Profesor, 'id'>): Promise<Profesor> {
  const res = await fetch(`${API_BASE_URL}/profesores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al registrar profesor.');
  return res.json();
}

export async function updateProfesor(id: number, data: Partial<Profesor>): Promise<Profesor> {
  const res = await fetch(`${API_BASE_URL}/profesores/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al actualizar profesor.');
  return res.json();
}

export async function deleteProfesor(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/profesores/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('No se pudo eliminar el profesor (puede tener cursos asociados).');
}