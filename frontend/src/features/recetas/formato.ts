export function cantidadConUnidad(cantidad: number, sufijo: string): string {
  return `${cantidad.toLocaleString('es-AR', { maximumFractionDigits: 3 })} ${sufijo}`;
}

export function numeroDesdeTexto(valor: string): number {
  return Number(valor.trim().replace(',', '.'));
}

export function textoOpcional(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor);
}
