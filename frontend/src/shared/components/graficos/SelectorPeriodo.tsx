import { Button, ButtonGroup, Form } from 'react-bootstrap';
import { PERIODOS_RAPIDOS } from '../../libreria/graficos';
import { fechaHoyIso, rangoUltimosDias, type RangoFechas } from '../../libreria/fechas';
import './graficos.css';

interface SelectorPeriodoProps {
  rango: RangoFechas;
  onCambiar: (rango: RangoFechas) => void;
  /** Prefijo para los ids de los campos (si hay más de un selector en la pantalla). */
  id?: string;
}

/** Accesos rápidos (7 días, 30 días...) más un período a medida. */
export function SelectorPeriodo({ rango, onCambiar, id = 'periodo' }: SelectorPeriodoProps) {
  const hoy = fechaHoyIso();
  const activo = PERIODOS_RAPIDOS.find(({ dias }) => {
    const candidato = rangoUltimosDias(dias);
    return candidato.desde === rango.desde && candidato.hasta === rango.hasta;
  });

  const cambiarDesde = (desde: string) => {
    if (!desde) return;
    onCambiar({ desde, hasta: desde > rango.hasta ? desde : rango.hasta });
  };
  const cambiarHasta = (hasta: string) => {
    if (!hasta) return;
    onCambiar({ desde: hasta < rango.desde ? hasta : rango.desde, hasta });
  };

  return (
    <div className="selector-periodo d-flex flex-wrap align-items-center gap-2">
      <ButtonGroup size="sm" aria-label="Períodos rápidos" className="selector-periodo-rapidos">
        {PERIODOS_RAPIDOS.map(({ dias, etiqueta }) => (
          <Button
            key={dias}
            className="text-nowrap"
            variant={activo?.dias === dias ? 'primary' : 'outline-primary'}
            aria-pressed={activo?.dias === dias}
            onClick={() => onCambiar(rangoUltimosDias(dias))}
          >
            {etiqueta}
          </Button>
        ))}
      </ButtonGroup>
      <div className="selector-periodo-fechas d-flex align-items-center gap-1">
        <Form.Label htmlFor={`${id}-desde`} className="visually-hidden">
          Desde
        </Form.Label>
        <Form.Control
          id={`${id}-desde`}
          type="date"
          size="sm"
          value={rango.desde}
          max={hoy}
          onChange={(e) => cambiarDesde(e.target.value)}
          style={{ width: '150px' }}
        />
        <span className="text-body-secondary small">al</span>
        <Form.Label htmlFor={`${id}-hasta`} className="visually-hidden">
          Hasta
        </Form.Label>
        <Form.Control
          id={`${id}-hasta`}
          type="date"
          size="sm"
          value={rango.hasta}
          max={hoy}
          onChange={(e) => cambiarHasta(e.target.value)}
          style={{ width: '150px' }}
        />
      </div>
    </div>
  );
}
