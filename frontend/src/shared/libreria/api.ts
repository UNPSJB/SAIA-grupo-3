export const API_BASE_URL = 'http://localhost:8000';

export function mensajeDeError(detail: unknown, porDefecto: string): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => String(d.msg).replace('Value error, ', ''))
      .join('\n');
  }
  return porDefecto;
}