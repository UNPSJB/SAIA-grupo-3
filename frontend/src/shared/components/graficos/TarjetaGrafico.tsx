import { useState, type ReactNode } from 'react';
import { Button, Card } from 'react-bootstrap';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorAlert } from '../ErrorAlert';
import './graficos.css';

interface TarjetaGraficoProps {
  titulo: string;
  subtitulo?: ReactNode;
  /** true mientras se piden datos: la primera vez muestra un spinner y después atenúa. */
  cargando?: boolean;
  error?: string | null;
  /** Sin datos para mostrar (ej. período sin incidentes). */
  vacio?: boolean;
  mensajeVacio?: string;
  /** Misma información en forma de tabla (accesibilidad y lectura exacta). */
  tabla?: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
}

/** Contenedor de un gráfico: título, estados de carga/error/vacío y vista de tabla. */
export function TarjetaGrafico({
  titulo,
  subtitulo,
  cargando = false,
  error = null,
  vacio = false,
  mensajeVacio = 'No hay datos para el período seleccionado.',
  tabla,
  acciones,
  children,
}: TarjetaGraficoProps) {
  const [verTabla, setVerTabla] = useState(false);
  const primeraCarga = cargando && vacio && !error;

  return (
    <Card className="grafico-tarjeta shadow-sm border-0 h-100">
      <Card.Header className="border-0 pb-0 d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div>
          <h6 className="mb-0 fw-semibold">{titulo}</h6>
          {subtitulo && <small className="text-body-secondary">{subtitulo}</small>}
        </div>
        <div className="d-flex align-items-center gap-2">
          {acciones}
          {tabla && !vacio && (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-decoration-none"
              aria-pressed={verTabla}
              onClick={() => setVerTabla((valor) => !valor)}
            >
              <i
                className={`bi ${verTabla ? 'bi-bar-chart-line' : 'bi-table'} me-1`}
                aria-hidden="true"
              />
              {verTabla ? 'Ver gráfico' : 'Ver tabla'}
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        {error && <ErrorAlert mensaje={error} />}
        {primeraCarga ? (
          <LoadingSpinner mensaje="Cargando gráfico..." />
        ) : vacio ? (
          !error && <p className="text-body-secondary text-center py-5 mb-0">{mensajeVacio}</p>
        ) : (
          <div className={`grafico-cuerpo ${cargando ? 'actualizando' : ''}`} aria-busy={cargando}>
            {verTabla && tabla ? tabla : children}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
