import { Card, Button, Badge } from 'react-bootstrap';
import type { Tarea } from './types';

interface TareaViewProps {
  tarea: Tarea;
  onEditar: () => void;
  onVolver: () => void;
}

export function TareaView({ tarea, onEditar, onVolver }: TareaViewProps) {
  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-card-checklist fs-5"></i>
        <h5 className="mb-0">Detalle de Tarea</h5>
      </Card.Header>
      <Card.Body className="p-4">
        <div className="bg-light p-3 rounded border mb-2">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">ID:</span>
            <span className="col-8 fw-bold">#{tarea.id}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Descripción:</span>
            <span className="col-8">{tarea.descripcion}</span>
          </div>
        </div>
      </Card.Body>
      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>Volver</Button>
        <Button variant="warning" onClick={onEditar}>Editar</Button>
      </Card.Footer>
    </Card>
  );
}