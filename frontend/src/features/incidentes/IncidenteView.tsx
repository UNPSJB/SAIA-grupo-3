import { Badge, Button, Card } from 'react-bootstrap';
import { EnlaceArchivo } from '../../shared/components/EnlaceArchivo';
import { useAuth } from '../../shared/hooks/useAuth';
import type { EstadoIncidente, Incidente } from './types';
import { ESTADOS_INCIDENTE } from './types';
import { HistorialIncidente } from './HistorialIncidente';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { textoBadge } from '../../shared/libreria/etiquetas';

interface IncidenteViewProps {
  incidente: Incidente;
  onEditar: () => void;
  onVolver: () => void;
}

export function IncidenteView({ incidente, onEditar, onVolver }: IncidenteViewProps) {
  const { currentUser } = useAuth();

  const getEstado = (valor: EstadoIncidente) =>
    ESTADOS_INCIDENTE.find((e) => e.value === valor) ?? { label: valor, variante: 'secondary' };
  const infoEstado = getEstado(incidente.estado);

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-exclamation-triangle fs-5"></i>
        <h5 className="mb-0">Detalle del Incidente</h5>
      </Card.Header>
      <Card.Body className="p-4">
        <div className="bg-light p-3 rounded border mb-2">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Fecha y hora:</span>
            <span className="col-8">{formatearFechaHora(incidente.fecha_hora)}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Tipo:</span>
            <span className="col-8">
              <Badge
                bg={incidente.tipo.color}
                text={textoBadge(incidente.tipo.color)}
              >
                {incidente.tipo.nombre}
              </Badge>
            </span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Reportado por:</span>
            <span className="col-8">
              {incidente.reportado_por.apellido}, {incidente.reportado_por.nombre}{' '}
              <small className="text-muted">(DNI: {incidente.reportado_por_dni})</small>
            </span>
          </div>

          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Descripción:</span>
            <span className="col-8 text-break">{incidente.descripcion}</span>
          </div>

          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Estado:</span>
            <span className="col-8">
              <Badge
                bg={infoEstado.variante}
                className={incidente.estado === 'abierto' ? 'text-dark' : ''}
              >
                {infoEstado.label}
              </Badge>
            </span>
          </div>

          <div className="row">
            <span className="col-4 text-muted fw-semibold">Foto:</span>
            <span className="col-8">
              {incidente.imagen_path ? (
                <EnlaceArchivo
                  ruta={incidente.imagen_path}
                  className="btn btn-outline-primary d-inline-flex align-items-center justify-content-center gap-2 text-nowrap"
                  title="Ver foto"
                  aria-label="Ver foto del incidente (abre en otra pestaña)"
                >
                  <i className="bi bi-image" aria-hidden="true"></i>
                  <span>Ver foto</span>
                </EnlaceArchivo>
              ) : (
                <Badge bg="secondary">Sin foto</Badge>
              )}
            </span>
          </div>
        </div>

        {currentUser?.administrar === true && <HistorialIncidente incidenteId={incidente.id} />}
      </Card.Body>

      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>
          Volver
        </Button>
        {currentUser?.administrar && (
          <Button variant="warning" onClick={onEditar} className="text-white">
            Editar
          </Button>
        )}
      </Card.Footer>
    </Card>
  );
}
