const LADO = 100;
const CORTE = LADO * 0.2929;
const PUNTOS = [
  [CORTE, 0],
  [LADO - CORTE, 0],
  [LADO, CORTE],
  [LADO, LADO - CORTE],
  [LADO - CORTE, LADO],
  [CORTE, LADO],
  [0, LADO - CORTE],
  [0, CORTE],
]
  .map(([x, y]) => `${x},${y}`)
  .join(' ');

function lineas(leyenda: string): { primera: string; resto: string[] } {
  const texto = leyenda.trim().toUpperCase();
  const prefijo = texto.startsWith('EXCESO EN ') ? 'EXCESO EN' : '';
  const cuerpo = prefijo ? texto.slice(prefijo.length).trim() : texto;
  return { primera: prefijo, resto: cuerpo.split(/\s+/) };
}

export function Octogono({ leyenda, tamano = 120 }: { leyenda: string; tamano?: number }) {
  const { primera, resto } = lineas(leyenda);
  const total = (primera ? 1 : 0) + resto.length;
  const alto = 15;
  const inicio = 50 - ((total - 1) * alto) / 2 + 5;
  const larga = Math.max(...resto.map((r) => r.length));
  const fuente = larga > 9 ? 11 : larga > 7 ? 13 : 15;
  return (
    <svg
      role="img"
      aria-label={leyenda}
      viewBox={`-4 -4 ${LADO + 8} ${LADO + 8}`}
      width={tamano}
      height={tamano}
      style={{ flex: 'none' }}
    >
      <polygon points={PUNTOS} fill="#000" stroke="#000" strokeWidth={4} strokeLinejoin="round" />
      <polygon
        points={PUNTOS}
        fill="none"
        stroke="#fff"
        strokeWidth={2.5}
        transform={`translate(${LADO * 0.05} ${LADO * 0.05}) scale(0.9)`}
        strokeLinejoin="round"
      />
      <g fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontWeight={800} textAnchor="middle">
        {primera && (
          <text x={50} y={inicio} fontSize={10}>
            {primera}
          </text>
        )}
        {resto.map((linea, indice) => (
          <text
            key={linea + indice}
            x={50}
            y={inicio + (indice + (primera ? 1 : 0)) * alto}
            fontSize={fuente}
          >
            {linea}
          </text>
        ))}
      </g>
    </svg>
  );
}

export function LeyendaPrecautoria({ texto }: { texto: string }) {
  return (
    <div
      className="d-inline-flex align-items-center justify-content-center text-center fw-bold px-2"
      style={{
        border: '3px solid #000',
        background: '#fff',
        color: '#000',
        maxWidth: '15rem',
        minHeight: '3.4rem',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '0.8rem',
        lineHeight: 1.2,
      }}
    >
      {texto}
    </div>
  );
}
