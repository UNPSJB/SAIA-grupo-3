import { Card, Button, Badge, ListGroup } from 'react-bootstrap';
import type { PlanRealizado } from './types';

interface AuditoriaViewProps {
  plan: PlanRealizado;
  onVolver: () => void;
}

export function AuditoriaView({ plan, onVolver }: AuditoriaViewProps) {
  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '900px' }}>
      <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-clipboard-check fs-5"></i>
        <h5 className="mb-0">Auditoría: Plan Realizado #{plan.id}</h5>
      </Card.Header>
      <Card.Body className="p-4">
        <div className="bg-light p-3 rounded border mb-4">
          <div className="row mb-2">
            <span className="col-sm-3 text-muted fw-semibold">Nombre del Plan:</span>
            <span className="col-sm-9 fw-bold">{plan.nombre}</span>
          </div>
          <div className="row mb-2">
            <span className="col-sm-3 text-muted fw-semibold">Fecha Ejecución:</span>
            <span className="col-sm-9">
              {new Date(plan.fecha_ejecucion).toLocaleString('es-AR')}
            </span>
          </div>
          <div className="row">
            <span className="col-sm-3 text-muted fw-semibold">Responsable (DNI):</span>
            <span className="col-sm-9">{plan.responsable_id}</span>
          </div>
        </div>

        <h6 className="fw-bold border-bottom pb-2">Tareas Completadas ({plan.tareas_realizadas.length})</h6>
        {!plan.tareas_realizadas || plan.tareas_realizadas.length === 0 ? (
          <p className="text-muted small py-3 text-center border rounded bg-light">No hay registro de tareas.</p>
        ) : (
          <ListGroup variant="flush" className="border rounded shadow-sm">
            {plan.tareas_realizadas.map((tarea) => (
              <ListGroup.Item key={tarea.id} className="py-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong className="text-success"><i className="bi bi-check-circle-fill me-2"></i>{tarea.nombre}</strong>
                  <Badge bg="info" className="text-dark text-capitalize">{tarea.frecuencia}</Badge>
                </div>
                <div className="text-muted small bg-light p-2 rounded border-0">
                  <strong>Procedimiento empleado:</strong>
                  <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>{tarea.procedimiento}</p>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>Volver al Listado</Button>
      </Card.Footer>
    </Card>
  );
}