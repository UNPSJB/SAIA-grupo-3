import type { ReactNode } from 'react';
import './graficos.css';

interface IndicadorNumericoProps {
  titulo: string;
  valor: ReactNode;
  /** Ícono de Bootstrap Icons (ej. "bi-exclamation-triangle"). */
  icono?: string;
  /** Variante de Bootstrap para el ícono (ej. "warning"). */
  variante?: string;
  detalle?: ReactNode;
}

/** Número destacado (KPI): cuando la respuesta es un solo valor, no hace falta un gráfico. */
export function IndicadorNumerico({
  titulo,
  valor,
  icono,
  variante = 'secondary',
  detalle,
}: IndicadorNumericoProps) {
  return (
    <div className="grafico-indicador">
      <div className="d-flex align-items-center gap-2 grafico-indicador-titulo">
        {icono && <i className={`bi ${icono} text-${variante}`} aria-hidden="true" />}
        <span>{titulo}</span>
      </div>
      <div className="grafico-indicador-valor">{valor}</div>
      {detalle && <small className="text-body-secondary">{detalle}</small>}
    </div>
  );
}
