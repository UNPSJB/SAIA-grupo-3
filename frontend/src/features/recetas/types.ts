import type { AditivoReferencia } from '../aditivos/types';
import type { UnidadMedida } from '../unidadMedida/types';

export type TipoInsumo = 'ingrediente' | 'aditivo';
export type EstadoVersion = 'vigente' | 'archivada';

export interface InsumoDisponible {
  id: number;
  nombre: string;
  activo: boolean;
  tipo: TipoInsumo;
  unidad_medida_id: number;
  unidadMedidaObj: UnidadMedida;
  aditivo_referencia: AditivoReferencia | null;
}

export interface ProductoResumen {
  id: number;
  nombre: string;
  activo: boolean;
  unidad_medida: UnidadMedida;
}

export interface PersonaResumen {
  id: number;
  nombre: string;
  apellido: string;
}

export interface Renglon {
  id: number;
  orden: number;
  tipo: TipoInsumo;
  cantidad: number;
  insumo: { id: number; nombre: string; activo: boolean };
  unidad_medida: UnidadMedida;
  aditivo_referencia: AditivoReferencia | null;
}

export interface Paso {
  id: number;
  orden: number;
  nombre: string;
  procedimiento: string;
  equipo: { id: number; nombre: string } | null;
  tiempo_minutos: number | null;
  temperatura_celsius: number | null;
  punto_control: boolean;
}

export interface VersionResumen {
  id: number;
  numero: number;
  estado: EstadoVersion;
  motivo: string;
  fecha_creacion: string;
  creado_por: PersonaResumen;
}

export interface Version extends VersionResumen {
  receta_id: number;
  rendimiento_cantidad: number;
  rendimiento_unidad: UnidadMedida;
  porcion_cantidad: number | null;
  porcion_unidad: UnidadMedida | null;
  porcion_medida_casera: string | null;
  renglones: Renglon[];
  pasos: Paso[];
}

export interface Receta {
  id: number;
  fecha_creacion: string;
  producto: ProductoResumen;
  version_vigente: Version;
  versiones: VersionResumen[];
}

export interface RecetaDeProducto {
  producto: ProductoResumen;
  receta_id: number | null;
  version_vigente: VersionResumen | null;
}

export interface RenglonDatos {
  insumo_id: number;
  tipo: TipoInsumo;
  cantidad: number;
  unidad_medida_id: number;
}

export interface PasoDatos {
  nombre: string;
  procedimiento: string;
  equipo_id: number | null;
  tiempo_minutos: number | null;
  temperatura_celsius: number | null;
  punto_control: boolean;
}

export interface VersionDatos {
  rendimiento_cantidad: number;
  rendimiento_unidad_id: number;
  porcion_cantidad: number | null;
  porcion_unidad_id: number | null;
  porcion_medida_casera: string | null;
  renglones: RenglonDatos[];
  pasos: PasoDatos[];
}

export interface RecetaCreate extends VersionDatos {
  producto_id: number;
  motivo?: string;
}

export interface NuevaVersion extends VersionDatos {
  version_base_id: number;
  motivo: string;
}

export const ETIQUETA_TIPO: Record<TipoInsumo, string> = {
  ingrediente: 'Ingrediente',
  aditivo: 'Aditivo',
};

export interface RenglonEscalado {
  insumo: { id: number; nombre: string; activo: boolean };
  tipo: TipoInsumo;
  aditivo_referencia: AditivoReferencia | null;
  unidad_medida: UnidadMedida;
  cantidad_receta: number;
  cantidad_escalada: number;
  unidad_stock: UnidadMedida;
  cantidad_en_unidad_stock: number | null;
  stock_disponible: number;
  stock_suficiente: boolean | null;
}

export interface Escalado {
  receta_id: number;
  version_id: number;
  version_numero: number;
  producto: ProductoResumen;
  factor: number;
  rendimiento_receta: number;
  rendimiento_escalado: number;
  rendimiento_unidad: UnidadMedida;
  cantidad_lote: number | null;
  renglones: RenglonEscalado[];
  hay_faltantes: boolean;
}

export type ModoEscalado = 'factor' | 'cantidad_objetivo';
