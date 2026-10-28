import type { ReactNode } from 'react';
import './graficos.css';

export interface LineaTooltip {
  etiqueta: string;
  valor: ReactNode;
  /** Color de la marca al lado del texto (el texto nunca usa el color del dato). */
  color?: string;
}

interface TooltipGraficoProps {
  titulo: ReactNode;
  lineas: LineaTooltip[];
  pie?: ReactNode;
}

/** Cuadro que aparece al pasar el mouse sobre un gráfico. */
export function TooltipGrafico({ titulo, lineas, pie }: TooltipGraficoProps) {
  return (
    <div className="grafico-tooltip" role="status">
      <div className="grafico-tooltip-titulo">{titulo}</div>
      {lineas.map((linea) => (
        <div key={linea.etiqueta} className="d-flex justify-content-between gap-3">
          <span>
            {linea.color && (
              <span
                className="grafico-tooltip-marca"
                style={{ background: linea.color }}
                aria-hidden="true"
              />
            )}
            {linea.etiqueta}
          </span>
          <strong>{linea.valor}</strong>
        </div>
      ))}
      {pie && <div className="text-body-secondary small mt-1">{pie}</div>}
    </div>
  );
}
