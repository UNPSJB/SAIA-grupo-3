// Fechas del sistema: un solo lugar para mostrarlas igual en todas las pantallas.
// Formato: dd/mm/aaaa y, con hora, dd/mm/aaaa HH:mm (24 h).

const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Convierte lo que manda el backend en un Date.
 * Una fecha sin hora ("2026-10-20") se interpreta en hora local: con new Date()
 * se toma como UTC y en Argentina se mostraría como el día anterior.
 */
export function parsearFecha(fecha: string): Date {
  if (SOLO_FECHA.test(fecha)) {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }
  return new Date(fecha);
}

/** dd/mm/aaaa. Acepta fechas solas o con hora; si no hay fecha muestra `sinFecha`. */
export function formatearFecha(fecha: string | null | undefined, sinFecha = 'Sin fecha'): string {
  if (!fecha) return sinFecha;
  return parsearFecha(fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** dd/mm/aaaa HH:mm (24 h). */
export function formatearFechaHora(fecha: string | null | undefined, sinFecha = 'Sin fecha'): string {
  if (!fecha) return sinFecha;
  return parsearFecha(fecha).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

/** Fecha de hoy como "aaaa-mm-dd" en hora local (para inputs type="date" y el backend). */
export function fechaHoyIso(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

function dias(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? 'día' : 'días'}`;
}

/** Texto de un vencimiento: "Faltan 3 días", "Vence hoy" o "Venció hace 2 días". */
export function textoDiasRestantes(diasRestantes: number): string {
  if (diasRestantes < 0) return `Venció hace ${dias(Math.abs(diasRestantes))}`;
  if (diasRestantes === 0) return 'Vence hoy';
  return `Faltan ${dias(diasRestantes)}`;
}

/** Texto de antigüedad: "Hoy", "1 día", "5 días". */
export function textoAntiguedad(diasTranscurridos: number): string {
  if (diasTranscurridos === 0) return 'Hoy';
  return dias(diasTranscurridos);
}

/** Suma (o resta, con números negativos) días a una fecha "aaaa-mm-dd". */
export function sumarDias(fecha: string, cantidad: number): string {
  const resultado = parsearFecha(fecha);
  resultado.setDate(resultado.getDate() + cantidad);
  const mes = String(resultado.getMonth() + 1).padStart(2, '0');
  const dia = String(resultado.getDate()).padStart(2, '0');
  return `${resultado.getFullYear()}-${mes}-${dia}`;
}

/** Período entre dos fechas "aaaa-mm-dd", ambas incluidas. */
export interface RangoFechas {
  desde: string;
  hasta: string;
}

/** Los últimos `dias` días contando hoy (ej. 7 → hoy y los 6 anteriores). */
export function rangoUltimosDias(dias: number): RangoFechas {
  const hasta = fechaHoyIso();
  return { desde: sumarDias(hasta, -(dias - 1)), hasta };
}

/** "01/10/2026 al 26/10/2026". */
export function textoRango({ desde, hasta }: RangoFechas): string {
  return `${formatearFecha(desde)} al ${formatearFecha(hasta)}`;
}
