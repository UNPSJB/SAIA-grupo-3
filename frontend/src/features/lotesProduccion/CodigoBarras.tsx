import { MODULOS_EAN13, barrasEan13 } from './ean13';

interface CodigoBarrasProps {
  codigo: string;
  modulo?: number;
  alto?: number;
  className?: string;
}

const ZONA_SILENCIO = 9;

export function CodigoBarras({ codigo, modulo = 2, alto = 64, className }: CodigoBarrasProps) {
  const barras = barrasEan13(codigo);
  if (barras.length === 0) return null;
  const extensionGuarda = 5 * modulo;
  const tamanoTexto = Math.max(10, 6 * modulo);
  const anchoTotal = (MODULOS_EAN13 + 2 * ZONA_SILENCIO) * modulo;
  const altoTotal = alto + extensionGuarda + tamanoTexto;
  const desde = ZONA_SILENCIO * modulo;
  const lineaTexto = alto + extensionGuarda + tamanoTexto - 2;
  const grupos = [
    { texto: codigo[0], x: desde - 4 * modulo },
    { texto: codigo.slice(1, 7), x: desde + 24 * modulo },
    { texto: codigo.slice(7), x: desde + 71 * modulo },
  ];

  return (
    <svg
      className={className}
      width={anchoTotal}
      height={altoTotal}
      viewBox={`0 0 ${anchoTotal} ${altoTotal}`}
      role="img"
      aria-label={`Código de barras ${codigo}`}
    >
      <rect width={anchoTotal} height={altoTotal} fill="#fff" />
      {barras.map((barra) => (
        <rect
          key={barra.inicio}
          x={desde + barra.inicio * modulo}
          y={0}
          width={barra.ancho * modulo}
          height={barra.guarda ? alto + extensionGuarda : alto}
          fill="#000"
        />
      ))}
      {grupos.map((grupo) => (
        <text
          key={grupo.x}
          x={grupo.x}
          y={lineaTexto}
          fontSize={tamanoTexto}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          textAnchor="middle"
          letterSpacing={modulo}
          fill="#000"
        >
          {grupo.texto}
        </text>
      ))}
    </svg>
  );
}
