export function formatearNumero(
  valor: number | null | undefined,
  decimalesMax = 2,
  decimalesMin = 0,
): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return valor.toLocaleString('es-AR', {
    minimumFractionDigits: decimalesMin,
    maximumFractionDigits: decimalesMax,
  });
}

export function formatearMoneda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return valor.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}