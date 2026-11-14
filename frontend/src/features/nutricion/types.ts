export type Nutriente =
  | 'energia'
  | 'carbohidratos'
  | 'azucares_totales'
  | 'azucares_anadidos'
  | 'proteinas'
  | 'grasas_totales'
  | 'grasas_saturadas'
  | 'grasas_trans'
  | 'fibra'
  | 'sodio';

export type FuenteNutricional =
  'base_referencia' | 'rotulo_proveedor' | 'bibliografia' | 'valor_propio';

export interface PersonaResumen {
  id: number;
  nombre: string;
  apellido: string;
}

export interface AlimentoResumen {
  id: number;
  fuente: string;
  codigo: string;
  nombre: string;
}

export interface AlimentoReferencia extends AlimentoResumen {
  grupo: string | null;
  energia_kcal: number | null;
  carbohidratos_g: number | null;
  azucares_totales_g: number | null;
  azucares_anadidos_g: number | null;
  proteinas_g: number | null;
  grasas_totales_g: number | null;
  grasas_saturadas_g: number | null;
  grasas_trans_g: number | null;
  fibra_g: number | null;
  sodio_mg: number | null;
}

export interface ValorNutricional {
  nutriente: Nutriente;
  etiqueta: string;
  unidad: string;
  valor: number;
  fuente: FuenteNutricional;
  detalle_fuente: string | null;
  alimento_referencia: AlimentoResumen | null;
  valor_fuente: number;
  cargado_por: PersonaResumen;
  cargado_en: string;
  modificado: boolean;
  modificado_por: PersonaResumen | null;
  modificado_en: string | null;
}

export interface NutrienteDisponible {
  nutriente: Nutriente;
  etiqueta: string;
  unidad: string;
}

export interface DatosNutricionales {
  insumo: {
    id: number;
    nombre: string;
    tipo: 'ingrediente' | 'aditivo';
    aporta_energia_sodio: boolean;
  };
  requiere_datos: boolean;
  nutrientes: NutrienteDisponible[];
  valores: ValorNutricional[];
  energia_kj: number | null;
  faltantes: Nutriente[];
}

export interface MovimientoHistorial {
  id: number;
  nutriente: Nutriente;
  etiqueta: string;
  accion: 'copia_referencia' | 'carga_manual' | 'modificacion' | 'borrado';
  valor_anterior: number | null;
  valor_nuevo: number | null;
  fuente: FuenteNutricional | null;
  detalle_fuente: string | null;
  alimento_referencia: AlimentoResumen | null;
  personal: PersonaResumen;
  fecha_hora: string;
}

export interface ResultadoImportacion {
  fuente: string;
  creados: number;
  actualizados: number;
  sin_cambios: number;
  errores: string[];
}

export const FUENTES: Record<FuenteNutricional, { etiqueta: string; color: string }> = {
  base_referencia: { etiqueta: 'Base de referencia', color: 'primary' },
  rotulo_proveedor: { etiqueta: 'Rótulo del proveedor', color: 'success' },
  bibliografia: { etiqueta: 'Bibliografía', color: 'info' },
  valor_propio: { etiqueta: 'Valor propio', color: 'secondary' },
};

export const CAMPO_DE_NUTRIENTE: Record<Nutriente, keyof AlimentoReferencia> = {
  energia: 'energia_kcal',
  carbohidratos: 'carbohidratos_g',
  azucares_totales: 'azucares_totales_g',
  azucares_anadidos: 'azucares_anadidos_g',
  proteinas: 'proteinas_g',
  grasas_totales: 'grasas_totales_g',
  grasas_saturadas: 'grasas_saturadas_g',
  grasas_trans: 'grasas_trans_g',
  fibra: 'fibra_g',
  sodio: 'sodio_mg',
};

export const NUTRIENTES_TODOS: NutrienteDisponible[] = [
  { nutriente: 'energia', etiqueta: 'Valor energético', unidad: 'kcal' },
  { nutriente: 'carbohidratos', etiqueta: 'Carbohidratos', unidad: 'g' },
  { nutriente: 'azucares_totales', etiqueta: 'Azúcares totales', unidad: 'g' },
  { nutriente: 'azucares_anadidos', etiqueta: 'Azúcares añadidos', unidad: 'g' },
  { nutriente: 'proteinas', etiqueta: 'Proteínas', unidad: 'g' },
  { nutriente: 'grasas_totales', etiqueta: 'Grasas totales', unidad: 'g' },
  { nutriente: 'grasas_saturadas', etiqueta: 'Grasas saturadas', unidad: 'g' },
  { nutriente: 'grasas_trans', etiqueta: 'Grasas trans', unidad: 'g' },
  { nutriente: 'fibra', etiqueta: 'Fibra alimentaria', unidad: 'g' },
  { nutriente: 'sodio', etiqueta: 'Sodio', unidad: 'mg' },
];
