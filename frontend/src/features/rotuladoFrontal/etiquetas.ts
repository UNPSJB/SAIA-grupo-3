import type {
  AplicaA,
  Comparacion,
  EstadoConjunto,
  Formula,
  Hecho,
  NutrienteEvaluable,
  Operador,
  ResultadoAplicabilidad,
  Sello,
  UmbralDatos,
} from './types';

export const ESTADOS: Record<EstadoConjunto, { etiqueta: string; color: string }> = {
  borrador: { etiqueta: 'Borrador', color: 'warning' },
  vigente: { etiqueta: 'Vigente', color: 'success' },
  archivado: { etiqueta: 'Archivado', color: 'secondary' },
};

export const SELLOS: Record<Sello, string> = {
  azucares: 'Azúcares',
  grasas_totales: 'Grasas totales',
  grasas_saturadas: 'Grasas saturadas',
  sodio: 'Sodio',
  calorias: 'Calorías',
};

export const FORMULAS: Record<Formula, string> = {
  porcentaje_energia: 'Proporción de la energía (g × factor × 100 ÷ kcal)',
  mg_por_kcal: 'mg por kcal',
  cantidad_por_100: 'Cantidad por 100 g o ml',
};

export const COMPARACIONES: Record<Comparacion, string> = { mayor_o_igual: '≥', mayor: '>' };

export const APLICA_A: Record<AplicaA, string> = {
  ambos: 'Sólidos y líquidos',
  solido: 'Sólidos',
  liquido: 'Líquidos',
};

export const NUTRIENTES: Record<NutrienteEvaluable, string> = {
  energia: 'Valor energético (kcal)',
  azucares_totales: 'Azúcares totales (g)',
  azucares_anadidos: 'Azúcares añadidos (g)',
  grasas_totales: 'Grasas totales (g)',
  grasas_saturadas: 'Grasas saturadas (g)',
  grasas_trans: 'Grasas trans (g)',
  sodio: 'Sodio (mg)',
};

export const HECHOS: Record<Hecho, string> = {
  envasado_ausencia_cliente: 'Se vende envasado en ausencia del cliente',
  agrega_azucares: 'Tiene azúcares añadidos',
  agrega_grasas: 'Tiene grasas añadidas',
  agrega_sodio: 'Tiene sodio añadido',
  contiene_edulcorantes: 'Contiene edulcorantes',
  contiene_cafeina: 'Contiene cafeína',
};

export const AGREGADOS: Hecho[] = ['agrega_azucares', 'agrega_grasas', 'agrega_sodio'];

export const OPERADORES: Record<Operador, string> = {
  ninguno: 'Si no se cumple ninguno de',
  alguno: 'Si se cumple alguno de',
  todos: 'Si se cumplen todos',
  siempre: 'En cualquier otro caso',
};

export const RESULTADOS: Record<ResultadoAplicabilidad, { etiqueta: string; color: string }> = {
  no_corresponde: { etiqueta: 'No corresponde', color: 'secondary' },
  exceptuado: { etiqueta: 'Exceptuado', color: 'info' },
  corresponde: { etiqueta: 'Corresponde calcular sellos', color: 'danger' },
};

export const UMBRAL_NUEVO: UmbralDatos = {
  sello: 'azucares',
  leyenda: 'EXCESO EN AZÚCARES',
  nutriente: 'azucares_anadidos',
  formula: 'porcentaje_energia',
  factor_energetico: 4,
  limite: 10,
  unidad: '% del valor energético',
  comparacion: 'mayor_o_igual',
  aplica_a: 'ambos',
  requiere_agregado: null,
  requiere_alguno_de: [],
  energia_maxima_porcion: null,
  nota: null,
};
