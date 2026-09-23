export interface Elemento {
  id?: number;
  nombre: string;
  frecuencia_recambio?: number | null;
  activo?: boolean;
  fecha_ultimo_recambio?: string | null;
  fecha_proximo_recambio?: string | null;
}