import { Card, Button, Badge } from 'react-bootstrap';
import type { ConsumoQuimico } from './types';

interface ConsumoQuimicoViewProps {
  consumo: ConsumoQuimico;
  onEditar: () => void;
  onVolver: () => void;
}

export function ConsumoQuimicoView({ consumo, onEditar, onVolver }: ConsumoQuimicoViewProps) {
  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-clipboard2-check fs-5"></i>
        <h5 className="mb-0">Detalle del Consumo (POES)</h5>
      </Card.Header>
      <Card.Body className="p-4">
        <div className="bg-light p-3 rounded border mb-2">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">ID de Registro:</span>
            <span className="col-8"><Badge bg="secondary">#{consumo.id}</Badge></span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Fecha:</span>
            <span className="col-8 fw-bold">{consumo.fecha}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Insumo Químico:</span>
            <span className="col-8">{consumo.insumo?.nombre || `Insumo ID: ${consumo.insumo_quimico_id}`}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Cantidad Utilizada:</span>
            <span className="col-8">{consumo.cantidad_utilizada}</span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Tarea:</span>
            <span className="col-8">{consumo.tarea_limpieza || 'No especificada'}</span>
          </div>
        </div>
      </Card.Body>
      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>Volver</Button>
        <Button variant="warning" onClick={onEditar} className="text-white">Editar</Button>
      </Card.Footer>
    </Card>
  );
}