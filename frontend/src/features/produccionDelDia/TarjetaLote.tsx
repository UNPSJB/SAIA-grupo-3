import { Badge, Button, Card, ListGroup, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { formatearFecha, formatearFechaHora } from '../../shared/libreria/fechas';
import type { LoteDelDia, PasoLote } from './types';

interface TarjetaLoteProps {
  lote: LoteDelDia;
  onRealizar: (paso: PasoLote) => void;
  onAnular: (paso: PasoLote) => void;
}

function DatosDelPaso({ paso }: { paso: PasoLote }) {
  return (
    <div className="small text-body-secondary d-flex flex-wrap column-gap-3">
      {paso.equipo && <span>Equipo: {paso.equipo.nombre}</span>}
      {paso.tiempo_minutos && <span>Tiempo: {paso.tiempo_minutos} min</span>}
      {paso.temperatura_celsius !== null && <span>Temperatura: {paso.temperatura_celsius} °C</span>}
    </div>
  );
}

export function TarjetaLote({ lote, onRealizar, onAnular }: TarjetaLoteProps) {
  const porcentaje = lote.total ? Math.round((lote.realizados / lote.total) * 100) : 0;
  const completo = lote.realizados === lote.total;

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-body py-3">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
          <div>
            <h3 className="h5 mb-1">{lote.producto.nombre}</h3>
            <div className="small text-body-secondary">
              Lote {lote.codigo} · {formatearFecha(lote.fecha_produccion)} ·{' '}
              {lote.cantidad.toLocaleString('es-AR')} {lote.unidad}
            </div>
          </div>
          {lote.receta_id && lote.version_numero && (
            <Link
              to={`/recetas/${lote.receta_id}`}
              className="badge text-bg-success text-decoration-none"
            >
              Receta versión {lote.version_numero}
            </Link>
          )}
        </div>
        <div className="d-flex justify-content-between small text-body-secondary mt-3 mb-1">
          <span>
            {lote.realizados} de {lote.total} pasos realizados
          </span>
          {completo && <span className="text-success fw-semibold">Todos los pasos hechos</span>}
        </div>
        <ProgressBar now={porcentaje} variant="success" style={{ height: 8 }} />
      </Card.Header>
      <ListGroup variant="flush" as="ol">
        {lote.pasos.map((paso) => {
          const hecho = paso.estado === 'realizado';
          return (
            <ListGroup.Item
              as="li"
              key={paso.id}
              className={`d-flex flex-column flex-sm-row gap-3 py-3 ${hecho ? 'bg-success-subtle' : ''}`}
            >
              <span
                className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold ${
                  hecho ? 'bg-success text-white' : 'border'
                }`}
                style={{ width: 36, height: 36 }}
                aria-hidden="true"
              >
                {hecho ? <i className="bi bi-check-lg" /> : paso.orden}
              </span>
              <div className="flex-grow-1">
                <div className="fw-semibold d-flex flex-wrap align-items-center gap-2">
                  <span className="visually-hidden">Paso {paso.orden}:</span>
                  {paso.nombre}
                  {paso.punto_control && <Badge bg="danger">Punto de control</Badge>}
                </div>
                <div className="small">{paso.procedimiento}</div>
                <DatosDelPaso paso={paso} />
                {hecho && (
                  <div className="small mt-2">
                    <i className="bi bi-person-check me-1" aria-hidden="true" />
                    {paso.realizado_por?.nombre} {paso.realizado_por?.apellido} ·{' '}
                    {formatearFechaHora(paso.realizado_en)}
                    {paso.valor_medido !== null && (
                      <span className="fw-semibold"> · Valor medido: {paso.valor_medido}</span>
                    )}
                    {paso.observacion && (
                      <div className="text-body-secondary">{paso.observacion}</div>
                    )}
                    {paso.foto_path && (
                      <div className="text-body-secondary">
                        <i className="bi bi-camera me-1" aria-hidden="true" />
                        Con foto
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 align-self-sm-center">
                {hecho ? (
                  <Button variant="outline-danger" size="sm" onClick={() => onAnular(paso)}>
                    Anular
                  </Button>
                ) : (
                  <Button
                    variant="success"
                    size="lg"
                    className="w-100 px-4"
                    aria-label={`Marcar paso ${paso.orden} como hecho`}
                    onClick={() => onRealizar(paso)}
                  >
                    <i className="bi bi-check2 me-1" aria-hidden="true" />
                    Hecho
                  </Button>
                )}
              </div>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Card>
  );
}
