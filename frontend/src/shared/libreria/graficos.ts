import { formatearFecha, parsearFecha } from './fechas';

/** Cómo agrupa el backend las series en el tiempo. */
export type AgrupacionPeriodo = 'dia' | 'semana' | 'mes';

/** Accesos rápidos del selector de período. */
export const PERIODOS_RAPIDOS: { dias: number; etiqueta: string }[] = [
  { dias: 7, etiqueta: '7 días' },
  { dias: 30, etiqueta: '30 días' },
  { dias: 90, etiqueta: '90 días' },
  { dias: 365, etiqueta: '12 meses' },
];

const VARIANTES_BOOTSTRAP = [
  'primary',
  'secondary',
  'success',
  'danger',
  'warning',
  'info',
  'light',
  'dark',
];

function leerVariableCss(nombre: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

/**
 * Convierte un color del sistema en un color que entiende el SVG del gráfico.
 * Acepta variantes de Bootstrap ("info", "danger"), variables CSS ("--bs-info")
 * o colores directos ("#198754"). Se resuelve en el momento porque los atributos
 * del SVG no aceptan var(--...).
 */
export function colorDeTema(color: string, respaldo = '#6c757d'): string {
  // "dark" y "light" desaparecen sobre el fondo del mismo tono: se usa el de mayor contraste.
  const temaOscuro = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  if ((color === 'dark' && temaOscuro) || (color === 'light' && !temaOscuro)) {
    return leerVariableCss('--bs-secondary-color') || respaldo;
  }
  if (VARIANTES_BOOTSTRAP.includes(color)) return leerVariableCss(`--bs-${color}`) || respaldo;
  if (color.startsWith('--')) return leerVariableCss(color) || respaldo;
  return color || respaldo;
}

/** Colores de ejes, grilla y textos según el tema actual (claro u oscuro). */
export interface ColoresGrafico {
  texto: string;
  textoSecundario: string;
  grilla: string;
  superficie: string;
  principal: string;
}

export function coloresGrafico(): ColoresGrafico {
  return {
    texto: colorDeTema('--bs-body-color', '#212529'),
    textoSecundario: colorDeTema('--bs-secondary-color', '#6c757d'),
    grilla: colorDeTema('--bs-border-color-translucent', '#dee2e6'),
    superficie: colorDeTema('--bs-body-bg', '#ffffff'),
    principal: colorDeTema('primary', '#0d6efd'),
  };
}

/** Número con separadores de Argentina: 1.234 o 2,5. */
export function formatearNumero(valor: number, decimales = 0): string {
  return valor.toLocaleString('es-AR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** Duración legible a partir de horas: "40 min", "5,5 h" o "2,3 días". */
export function formatearDuracionHoras(horas: number | null | undefined): string {
  if (horas === null || horas === undefined) return 'Sin datos';
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 48) return `${formatearNumero(horas, horas < 10 ? 1 : 0)} h`;
  return `${formatearNumero(horas / 24, 1)} días`;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Etiqueta de un período del eje X. Corta: "20/10", "sem 20/10", "oct 26".
 * Larga (tooltips): "20/10/2026", "Semana del 20/10/2026", "octubre 2026".
 */
export function etiquetaPeriodo(
  fecha: string,
  agrupacion: AgrupacionPeriodo,
  larga = false,
): string {
  const dia = parsearFecha(fecha);
  const ddmm = formatearFecha(fecha).slice(0, 5);
  if (agrupacion === 'mes') {
    if (larga) return dia.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return `${MESES[dia.getMonth()]} ${String(dia.getFullYear()).slice(2)}`;
  }
  if (agrupacion === 'semana') return larga ? `Semana del ${formatearFecha(fecha)}` : `sem ${ddmm}`;
  return larga ? formatearFecha(fecha) : ddmm;
}
