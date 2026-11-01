export type EstadoVencimiento = 'vencido' | 'por_vencer' | 'vigente';

export interface Pagina<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ProveedorInput {
  nombre: string;
  cuit: string;
  telefono: string | null;
  email: string | null;
  numero_habilitacion: string | null;
  vencimiento_habilitacion: string | null;
}

export interface Proveedor extends ProveedorInput {
  id: number;
  activo: boolean;
  habilitacion_estado: EstadoVencimiento | null;
}

export interface LoteInput {
  insumo_id: number;
  proveedor_id: number;
  numero_lote: string;
  cantidad: number;
  fecha_recepcion: string;
  fecha_vencimiento: string;
  clave_operacion: string;
}

export interface LoteRecepcion extends LoteInput {
  id: number;
  insumo_nombre: string;
  unidad: string;
  proveedor_nombre: string;
  cantidad_disponible: number;
  registrado_por_id: number;
  fecha_registro: string;
  activo: boolean;
  conciliacion: boolean;
  estado_vencimiento: EstadoVencimiento;
  dias_restantes: number;
  advertencias: string[];
}

export interface Stock {
  insumo_id: number;
  stock_total: number;
  stock_identificado: number;
  stock_sin_lote: number;
  stock_utilizable: number;
  stock_vencido: number;
}

export interface ConsumoRecepcion {
  lote_produccion_id: number;
  codigo: string;
  producto: string;
  fecha_produccion: string;
  cantidad_utilizada: number;
  activo: boolean;
}
