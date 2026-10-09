import { Badge, Button, Card } from 'react-bootstrap';
import { API_BASE_URL } from '../../shared/libreria/api';
import { useAuth } from '../../shared/hooks/useAuth';
import type { Incidente } from './types';

interface IncidenteViewProps {
  incidente: Incidente;
  onEditar: () => void;
  onVolver: () => void;
}

export function IncidenteView({ incidente, onEditar, onVolver }: IncidenteViewProps) {
  const { currentUser } = useAuth();

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
            <span className="col-8">
              {new Date(incidente.fecha_hora).toLocaleString()}
            </span>
          </div>

          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Reportado por:</span>
            <span className="col-8">
              {incidente.reportado_por.apellido},{' '}
              {incidente.reportado_por.nombre}{' '}
              <small className="text-muted">
                (DNI: {incidente.reportado_por_dni})
              </small>
            </span>
          </div>

          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Descripción:</span>
            <span className="col-8 text-break">{incidente.descripcion}</span>
          </div>

          <div className="row">
            <span className="col-4 text-muted fw-semibold">Foto:</span>
            <span className="col-8">
              {incidente.imagen_path ? (
                <a
                  href={`${API_BASE_URL}${incidente.imagen_path}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver foto
                </a>
              ) : (
                <Badge bg="secondary">Sin foto</Badge>
              )}
            </span>
          </div>
        </div>
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
