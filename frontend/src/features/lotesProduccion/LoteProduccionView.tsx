import { Badge, Button, Card } from 'react-bootstrap';
import { formatearFecha, formatearFechaHora } from '../../shared/libreria/fechas';
import { formatearCantidad } from './formato';
import type { LoteProduccion } from './types';

interface LoteProduccionViewProps {
  lote: LoteProduccion;
  onVolver: () => void;
  recienRegistrado?: boolean;
}

export function LoteProduccionView({
  lote,
  onVolver,
  recienRegistrado = false,
}: LoteProduccionViewProps) {
  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-body-tertiary text-secondary d-flex flex-wrap align-items-center gap-2 py-3">
        <i className="bi bi-box2 fs-5"></i>
        <h5 className="mb-0">Lote {lote.codigo}</h5>
        {!lote.activo && <Badge bg="danger">Dado de baja</Badge>}
      </Card.Header>
      <Card.Body className="p-4">
        {recienRegistrado && (
          <div className="alert alert-success d-flex align-items-center gap-2" role="status">
            <i className="bi bi-check-circle-fill"></i>
            <span>El lote se registró correctamente.</span>
          </div>
        )}
        <div className="bg-body-tertiary p-3 rounded border">
          <div className="row mb-2">
            <span className="col-5 text-muted fw-semibold">Producto:</span>
            <span className="col-7 fw-bold">{lote.producto.nombre}</span>
          </div>
          <div className="row mb-2">
            <span className="col-5 text-muted fw-semibold">Fecha de producción:</span>
            <span className="col-7">{formatearFecha(lote.fecha_produccion)}</span>
          </div>
          <div className="row mb-2">
            <span className="col-5 text-muted fw-semibold">Cantidad producida:</span>
            <span className="col-7">
              {formatearCantidad(lote.cantidad)} {lote.producto.unidad_medida.sufijo}
            </span>
          </div>
          <div className="row mb-2">
            <span className="col-5 text-muted fw-semibold">Observaciones:</span>
            <span className="col-7 text-break">{lote.observaciones ?? 'Sin observaciones'}</span>
          </div>
          <div className="row">
            <span className="col-5 text-muted fw-semibold">Registrado por:</span>
            <span className="col-7">
              {lote.registrado_por.apellido}, {lote.registrado_por.nombre}
              <small className="d-block text-muted">
                {formatearFechaHora(lote.fecha_registro)}
              </small>
            </span>
          </div>
        </div>
      </Card.Body>
      <Card.Footer className="bg-body border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>
          Volver al listado
        </Button>
      </Card.Footer>
    </Card>
  );
}
