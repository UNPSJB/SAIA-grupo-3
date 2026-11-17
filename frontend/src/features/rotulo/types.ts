export type TipoRegistro = 'rnpa' | 'rppa';
export type UnidadVidaUtil = 'dias' | 'meses';
export type CampoAutomatico = 'denominacion_venta' | 'lista_ingredientes' | 'identificacion_lote';

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
}

export interface Borrador extends Omit<
  BorradorDatos,
  'contenido_neto_unidad_id' | 'leyenda_duracion'
> {
  id: number;
  producto: { id: number; nombre: string; activo: boolean };
  contenido_neto_unidad: { id: number; sufijo: string; tipo: string } | null;
  leyenda_duracion: string;
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
