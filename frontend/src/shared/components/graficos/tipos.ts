/** Un punto de una serie en el tiempo (gráficos de líneas y de columnas). */
export interface PuntoSerie {
  /** Identificador del punto (ej. la fecha "2026-10-20"). */
  clave: string;
  /** Texto corto para el eje X. */
  etiqueta: string;
  /** Texto completo para el tooltip. */
  etiquetaLarga?: string;
  valor: number;
}
