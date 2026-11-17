export type EstadoConjunto = 'borrador' | 'vigente' | 'archivado';
export type Sello = 'azucares' | 'grasas_totales' | 'grasas_saturadas' | 'sodio' | 'calorias';
export type Formula = 'porcentaje_energia' | 'mg_por_kcal' | 'cantidad_por_100';
export type Comparacion = 'mayor_o_igual' | 'mayor';
export type AplicaA = 'solido' | 'liquido' | 'ambos';
export type TipoProducto = 'solido' | 'liquido';
export type Hecho =
  | 'envasado_ausencia_cliente'
  | 'agrega_azucares'
  | 'agrega_grasas'
  | 'agrega_sodio'
  | 'contiene_edulcorantes'
  | 'contiene_cafeina';
export type Operador = 'alguno' | 'todos' | 'ninguno' | 'siempre';
export type ResultadoAplicabilidad = 'no_corresponde' | 'exceptuado' | 'corresponde';
export type NutrienteEvaluable =
  | 'energia'
  | 'azucares_totales'
  | 'azucares_anadidos'
  | 'grasas_totales'
  | 'grasas_saturadas'
  | 'grasas_trans'
  | 'sodio';

export interface UmbralDatos {
  sello: Sello;
  leyenda: string;
  nutriente: NutrienteEvaluable;
  formula: Formula;
  factor_energetico: number | null;
  limite: number;
  unidad: string;
  comparacion: Comparacion;
  aplica_a: AplicaA;
  requiere_agregado: Hecho | null;
  requiere_alguno_de: Sello[];
  energia_maxima_porcion: number | null;
  nota: string | null;
}

export interface ReglaDatos {
  operador: Operador;
  hechos: Hecho[];
  resultado: ResultadoAplicabilidad;
  mensaje: string;
}

export interface AdvertenciaDatos {
  hecho: Hecho;
  texto: string;
}

export interface ConjuntoDatos {
  nombre: string;
  norma_origen: string;
  fecha_vigencia: string | null;
  motivo: string;
  umbrales: UmbralDatos[];
  reglas: ReglaDatos[];
  advertencias: AdvertenciaDatos[];
}

export interface PersonaResumen {
  id: number;
  nombre: string;
  apellido: string;
}

export interface ConjuntoReferencia {
  id: number;
  numero: number;
  estado: EstadoConjunto;
  nombre: string;
  norma_origen: string;
  fecha_vigencia: string | null;
}

export interface ConjuntoResumen extends ConjuntoReferencia {
  motivo: string;
  creado_por: PersonaResumen | null;
  creado_en: string;
  publicado_por: PersonaResumen | null;
  publicado_en: string | null;
  archivado_en: string | null;
  version_base_id: number | null;
}

export interface Conjunto extends ConjuntoResumen {
  umbrales: (UmbralDatos & { id: number; orden: number })[];
  reglas: (ReglaDatos & { id: number; orden: number })[];
  advertencias: (AdvertenciaDatos & { id: number; orden: number })[];
}

export interface EntradaPrueba {
  tipo: TipoProducto;
  por_100: Partial<Record<NutrienteEvaluable, number | null>>;
  energia_porcion: number | null;
  hechos: Hecho[];
}

export interface DetalleUmbral {
  orden: number;
  sello: Sello;
  leyenda: string;
  nutriente: NutrienteEvaluable;
  formula: Formula;
  evaluado: boolean;
  motivo: string | null;
  operacion: string | null;
  valor: number | null;
  limite: number;
  unidad: string;
  simbolo: string;
  supera: boolean;
}

export interface ResultadoPrueba {
  conjunto: ConjuntoReferencia;
  aplicabilidad: { resultado: ResultadoAplicabilidad; mensaje: string; regla_orden: number | null };
  sellos: Sello[];
  leyendas: string[];
  advertencias: string[];
  detalle: DetalleUmbral[];
}

export interface AgregadoProducto {
  hecho: Hecho;
  etiqueta: string;
  sugerido: boolean;
  causas: { id: number; nombre: string; tipo: string }[];
  corregido: boolean | null;
  valor: boolean;
}

export interface RecetaEvaluada {
  receta_id: number;
  version_id: number;
  numero: number;
}

export interface AplicabilidadProducto {
  producto: { id: number; nombre: string; activo: boolean };
  receta: RecetaEvaluada | null;
  envasado_ausencia_cliente: boolean | null;
  tipo_producto: TipoProducto;
  agregados: AgregadoProducto[];
  evaluacion: {
    resultado: ResultadoAplicabilidad;
    mensaje: string;
    regla_orden: number | null;
    conjunto: ConjuntoReferencia;
    version_receta: RecetaEvaluada | null;
    hechos: Hecho[];
    evaluado_por: PersonaResumen | null;
    evaluado_en: string;
  } | null;
  avisos: string[];
  historial: {
    id: number;
    hecho: Hecho;
    etiqueta: string;
    valor_sugerido: boolean;
    valor_anterior: boolean | null;
    valor_nuevo: boolean | null;
    motivo: string | null;
    personal: PersonaResumen;
    fecha_hora: string;
  }[];
}

export interface AplicabilidadDatos {
  envasado_ausencia_cliente: boolean;
  tipo_producto: TipoProducto;
  correcciones: { hecho: Hecho; valor: boolean | null; motivo: string | null }[];
}
<<<<<<< HEAD

export interface CalculoSellos {
  id: number;
  producto_id: number;
  version_receta: RecetaEvaluada;
  conjunto: ConjuntoReferencia;
  tipo_producto: TipoProducto;
  base: string | null;
  provisorio: boolean;
  faltantes: string[];
  entrada: Record<string, number | null>;
  hechos: Hecho[];
  sellos: Sello[];
  leyendas: string[];
  advertencias: string[];
  detalle: (DetalleUmbral & { datos: Record<string, number> })[];
  calculado_por: PersonaResumen;
  calculado_en: string;
}

export interface SellosProducto {
  producto: { id: number; nombre: string; activo: boolean };
  aplicabilidad: {
    resultado: ResultadoAplicabilidad;
    mensaje: string;
    regla_orden: number | null;
  } | null;
  puede_calcular: boolean;
  motivo_no_calcula: string | null;
  calculo: CalculoSellos | null;
  avisos: string[];
  historial: {
    id: number;
    conjunto_numero: number;
    receta_numero: number;
    sellos: Sello[];
    provisorio: boolean;
    calculado_en: string;
  }[];
}
=======
>>>>>>> dev
