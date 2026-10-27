// Avisos entre pantallas: una parte del sistema avisa que algo cambió y las
// que muestran esos datos (gráficos, contadores) se recargan solas.

export function avisarCambio(evento: string): void {
  window.dispatchEvent(new Event(evento));
}
