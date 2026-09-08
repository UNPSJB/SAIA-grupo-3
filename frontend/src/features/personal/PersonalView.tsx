import { Card, Button, Badge } from 'react-bootstrap';
import { TIPOS_CAPACIDAD } from './types';
import type { Personal } from './types';

interface PersonalViewProps {
  personal: Personal;
  onEditar: () => void;
  onVolver: () => void;
}

export function PersonalView({ personal, onEditar, onVolver }: PersonalViewProps) {
  const etiquetaCapacidad =
    TIPOS_CAPACIDAD.find((t) => t.value === personal.tipo_capacidad)?.label ??
    personal.tipo_capacidad;

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-person-vcard fs-5"></i>
        <h5 className="mb-0">Detalle del Empleado</h5>
      </Card.Header>
      <Card.Body className="p-4">
        <div className="bg-light p-3 rounded border mb-2">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">DNI:</span>
            <span className="col-8 fw-bold">{personal.dni}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Legajo:</span>
            <span className="col-8"><Badge bg="secondary">#{personal.nroLegajo}</Badge></span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Nombre Completo:</span>
            <span className="col-8">{personal.apellido}, {personal.nombre}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Email:</span>
            <span className="col-8">{personal.email}</span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Capacidad:</span>
            <span className="col-8"><Badge bg="info" className="text-dark">{etiquetaCapacidad}</Badge></span>
          </div>
        </div>
      </Card.Body>
      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>Volver</Button>
        <Button variant="warning" onClick={onEditar}>Editar</Button>      </Card.Footer>
    </Card>
  );
}