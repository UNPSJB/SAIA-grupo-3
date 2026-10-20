// Etiquetas y colores de los tipos: un solo lugar para traducir un valor del
// backend al texto y al color que se muestran en pantalla.

export interface OpcionTipo<T extends string = string> {
  value: T;
  label: string;
}

/** Texto a mostrar para un valor (ej. "ficha_tecnica" → "Ficha técnica"). */
export function etiquetaDe<T extends string>(opciones: readonly OpcionTipo<T>[], valor: T | string): string {
  return opciones.find((opcion) => opcion.value === valor)?.label ?? valor;
}

const FONDOS_CLAROS = ['info', 'warning', 'light'];

/** Color del texto de un Badge: oscuro sobre fondos claros para que se lea. */
export function textoBadge(fondo: string): 'dark' | undefined {
  return FONDOS_CLAROS.includes(fondo) ? 'dark' : undefined;
}
