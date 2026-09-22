import { Card, Button } from 'react-bootstrap';
import type { Elemento } from './types';

interface ElementoViewProps {
  elemento: Elemento;
  onEditar: () => void;
  onVolver: () => void;
}

export function ElementoView({ elemento, onEditar, onVolver }: ElementoViewProps) {
  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-tools fs-5"></i>
        <h5 className="mb-0">Detalle del Elemento</h5>
      </Card.Header>
      <Card.Body className="p-4">
        <div className="bg-light p-3 rounded border mb-2">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Nombre:</span>
            <span className="col-8">{elemento.nombre}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Recambio:</span>
            <span className="col-8">
              {elemento.frecuencia_recambio ? `${elemento.frecuencia_recambio} días` : 'No definido'}
            </span>
          </div>
        </div>
      </Card.Body>
      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>
          Volver
        </Button>
        <Button variant="warning" onClick={onEditar} className="text-white">
          Editar
        </Button>
      </Card.Footer>
    </Card>
  );
}