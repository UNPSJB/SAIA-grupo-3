export interface LoteRecepcionTrazabilidad {
  lote_recepcion_id: number;
  numero_lote: string;
  proveedor_nombre: string;
  fecha_recepcion: string;
  fecha_vencimiento: string;
  cantidad_utilizada: number;
}

export interface InsumoTrazabilidad {
  insumo_id: number;
  insumo_nombre: string;
  unidad: string;
  cantidad_usada: number;
  lotes_recepcion: LoteRecepcionTrazabilidad[];
  cantidad_stock_anterior: number;
  cantidad_historica_sin_origen: number;
}

export interface TrazabilidadProduccion {
  lote_produccion_id: number;
  codigo: string;
  producto_nombre: string;
  fecha_produccion: string;
  insumos: InsumoTrazabilidad[];
}
