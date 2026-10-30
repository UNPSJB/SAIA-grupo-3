export function formatearCantidad(cantidad: number): string {
  return cantidad.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}
