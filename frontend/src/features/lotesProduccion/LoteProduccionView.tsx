import { Badge, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { formatearFecha, formatearFechaHora } from '../../shared/libreria/fechas';
import { EstadoLoteBadge } from './EstadoLoteBadge';
import { ESTADOS_EN_CURSO } from './estados';
import { formatearCantidad } from './formato';
import { IdentificacionLote } from './IdentificacionLote';
import { TrazabilidadProduccionDetalle } from './TrazabilidadProduccionDetalle';
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
  const { currentUser } = useAuth();
  return (
    <Card className="shadow-sm border-0 mx-auto w-100" style={{ maxWidth: '1100px' }}>
      <Card.Header className="bg-body-tertiary text-secondary d-flex flex-wrap align-items-center gap-2 py-3">
        <i className="bi bi-box2 fs-5"></i>
        <h5 className="mb-0">Lote {lote.codigo}</h5>
        {!lote.activo && <Badge bg="danger">Dado de baja</Badge>}
        <span className="ms-auto">
          <EstadoLoteBadge estado={lote.estado} />
        </span>
      </Card.Header>
      <Card.Body className="p-4">
        {lote.estado === 'anulado' && (
          <div className="alert alert-danger d-flex align-items-center gap-2" role="status">
            <i className="bi bi-slash-circle"></i>
            <span>
              Este lote fue anulado
              {lote.fecha_anulacion ? ` el ${formatearFechaHora(lote.fecha_anulacion)}` : ''}.
              Motivo: {lote.motivo_anulacion ?? '—'}
            </span>
          </div>
        )}
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
          {lote.version_receta && (
            <div className="row mb-2">
              <span className="col-5 text-muted fw-semibold">Receta utilizada:</span>
              <span className="col-7">
                <Link
                  to={`/recetas/${lote.version_receta.receta_id}/versiones/${lote.version_receta.id}`}
                >
                  Versión {lote.version_receta.numero}
                </Link>
                {lote.factor_receta !== null && (
                  <span className="text-muted">
                    {' '}
                    · factor ×{formatearCantidad(lote.factor_receta)}
                  </span>
                )}
              </span>
            </div>
          )}
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
        <div className="mt-4">
          <IdentificacionLote lote={lote} />
        </div>
        <TrazabilidadProduccionDetalle loteId={lote.id} />
      </Card.Body>
      <Card.Footer className="bg-body border-top-0 d-flex flex-wrap justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>
          Volver al listado
        </Button>
        {currentUser?.administrar && (
          <Link to={`/lotes/${lote.id}/expediente`} className="btn btn-primary">
            <i className="bi bi-file-earmark-pdf me-1" aria-hidden="true"></i> Expediente de
            trazabilidad
          </Link>
        )}
        {lote.version_receta && lote.activo && ESTADOS_EN_CURSO.includes(lote.estado) && (
          <Link to={`/produccion-del-dia?lote=${lote.id}`} className="btn btn-success">
            <i className="bi bi-list-check me-1" aria-hidden="true" />
            Seguir los pasos en Producción del día
          </Link>
        )}
      </Card.Footer>
    </Card>
  );
}
