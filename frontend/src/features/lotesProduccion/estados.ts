import type { EstadoLote } from './types';

export const ESTADOS_LOTE: Record<EstadoLote, { etiqueta: string; bg: string; text?: 'dark' }> = {
  abierto: { etiqueta: 'Abierto', bg: 'info', text: 'dark' },
  en_produccion: { etiqueta: 'En producción', bg: 'warning', text: 'dark' },
  finalizado: { etiqueta: 'Finalizado', bg: 'success' },
  cerrado: { etiqueta: 'Cerrado', bg: 'secondary' },
  anulado: { etiqueta: 'Anulado', bg: 'danger' },
};

export const ESTADOS_EN_CURSO: EstadoLote[] = ['abierto', 'en_produccion', 'finalizado'];
