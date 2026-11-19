import type { InformacionNutricional } from '../nutricion/types';
import type { Composicion, Version } from '../recetas/types';
import type { SellosProducto } from '../rotuladoFrontal/types';

export type TipoRegistro = 'rnpa' | 'rppa';
export type UnidadVidaUtil = 'dias' | 'meses';
export type CampoAutomatico = 'denominacion_venta' | 'lista_ingredientes' | 'identificacion_lote';
export type EstadoDeclaracion = 'sugerida' | 'confirmada';
export type CondicionConservacion = 'ambiente' | 'refrigerado' | 'congelado';

export interface PersonaResumen {
  id: number;
  nombre: string;
  apellido: string;
}

export interface CampoAutomaticoEstado {
  campo: CampoAutomatico;
  etiqueta: string;
  valor: string | null;
  valor_sistema: string | null;
  origen: string;
  editado: boolean;
  editado_por: PersonaResumen | null;
  editado_en: string | null;
  cambio_en_sistema: boolean;
}

export interface InsumoCausa {
  id: number;
  nombre: string;
}

export interface DeclaracionAlergenos {
  estado: EstadoDeclaracion;
  version_receta_numero: number | null;
  contiene: {
    id: number;
    nombre: string;
    grupo: string;
    implica_gluten: boolean;
    causas: InsumoCausa[];
  }[];
  contiene_gluten: boolean;
  causas_gluten: InsumoCausa[];
  puede_contener: { id: number; nombre: string; grupo: string; activo: boolean }[];
  texto_contiene: string | null;
  texto_puede_contener: string | null;
  confirmado_por: PersonaResumen | null;
  confirmado_en: string | null;
  aviso: string | null;
  advertencias: string[];
}

export interface Faltante {
  campo: string;
  etiqueta: string;
  seccion: string;
}

export interface BorradorDatos {
  denominacion_venta: string | null;
  lista_ingredientes: string | null;
  identificacion_lote: string | null;
  contenido_neto: number | null;
  contenido_neto_unidad_id: number | null;
  razon_social: string | null;
  domicilio: string | null;
  pais_origen: string | null;
  tipo_registro: TipoRegistro | null;
  numero_registro: string | null;
  numero_establecimiento: string | null;
  es_importado: boolean;
  importador_razon_social: string | null;
  importador_domicilio: string | null;
  vida_util_cantidad: number | null;
  vida_util_unidad: UnidadVidaUtil;
  leyenda_duracion: string | null;
  requiere_instrucciones: boolean;
  instrucciones: string | null;
  puede_contener_ids: number[];
  conservacion_condicion: CondicionConservacion | null;
  conservacion_temp_min: number | null;
  conservacion_temp_max: number | null;
  conservacion_duracion_cantidad: number | null;
  conservacion_duracion_unidad: UnidadVidaUtil;
  conservacion_abierto: string | null;
}

export interface Borrador extends Omit<
  BorradorDatos,
  'contenido_neto_unidad_id' | 'leyenda_duracion' | 'puede_contener_ids'
> {
  id: number;
  producto: { id: number; nombre: string; activo: boolean };
  contenido_neto_unidad: { id: number; sufijo: string; tipo: string } | null;
  leyenda_duracion: string;
  leyenda_conservacion: string | null;
  alergenos: DeclaracionAlergenos;
  automaticos: CampoAutomaticoEstado[];
  informacion_nutricional: {
    receta_id: number;
    version_id: number;
    numero: number;
    completa: boolean;
    faltantes: number;
    calculada_en: string;
  } | null;
  rotulado_frontal: {
    resultado: 'no_corresponde' | 'exceptuado' | 'corresponde' | null;
    mensaje: string | null;
    calculo_id: number | null;
    leyendas: string[];
    advertencias: string[];
    provisorio: boolean;
    conjunto_numero: number | null;
    conjunto_fecha_vigencia: string | null;
    calculado_en: string | null;
  } | null;
  completitud: { porcentaje: number; completos: number; total: number; faltantes: Faltante[] };
  ediciones: {
    id: number;
    campo: CampoAutomatico;
    etiqueta: string;
    origen: string;
    valor_sistema: string | null;
    valor_original: string | null;
    valor_nuevo: string | null;
    personal: PersonaResumen;
    fecha_hora: string;
  }[];
  creado_por: PersonaResumen;
  creado_en: string;
  actualizado_por: PersonaResumen;
  actualizado_en: string;
}

export interface RotuloListado {
  producto: { id: number; nombre: string; activo: boolean };
  borrador_id: number | null;
  porcentaje: number | null;
  faltantes: number;
  actualizado_en: string | null;
}

export interface VistaPrevia {
  leyenda_borrador: string;
  generada_en: string;
  borrador: Borrador;
  contenido_neto_texto: string | null;
  fecha_duracion: {
    leyenda: string;
    fecha: string | null;
    lote_codigo: string | null;
    lote_fecha_produccion: string | null;
  };
  informacion_nutricional: InformacionNutricional | null;
  tabla_incompleta: boolean;
  faltantes: Faltante[];
  advertencias: string[];
  lista_para_revision: boolean;
}

export interface FuenteInsumo {
  insumo_id: number;
  insumo: string;
  tipo: string;
  porcentaje: number | null;
  fuentes: string[];
  detalles: string[];
  alimentos_referencia: string[];
  nutrientes_cargados: number;
  actualizado_en: string | null;
}

export interface Anexo {
  producto: { id: number; nombre: string; activo: boolean };
  receta: Version;
  composicion: Composicion;
  informacion_nutricional: InformacionNutricional;
  fuentes: FuenteInsumo[];
  rotulado_frontal: SellosProducto | null;
  conjunto_parametros_numero: number | null;
}

export interface ExportacionResumen {
  id: number;
  numero: number;
  producto: { id: number; nombre: string; activo: boolean };
  version_receta_numero: number;
  conjunto_parametros_numero: number | null;
  lista_para_revision: boolean;
  faltantes: number;
  generado_por: PersonaResumen;
  generado_en: string;
}

export interface Exportacion extends ExportacionResumen {
  vista_previa: VistaPrevia;
  anexo: Anexo;
}
