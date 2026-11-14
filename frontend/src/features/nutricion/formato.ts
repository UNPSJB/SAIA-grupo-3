export function formatearValor(valor: number | null | undefined, unidad = ''): string {
  if (valor === null || valor === undefined) return '—';
  const texto = valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  return unidad ? `${texto} ${unidad}` : texto;
}

export function numeroDesdeTexto(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : Number.NaN;
}
