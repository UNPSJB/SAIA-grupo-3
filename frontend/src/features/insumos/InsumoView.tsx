import { Card, Button, Badge } from 'react-bootstrap';
import type { Insumo } from './types';

interface InsumoViewProps {
  insumo: Insumo;
  onEditar: () => void;
  onVolver: () => void;
}

export function InsumoView({ insumo, onEditar, onVolver }: InsumoViewProps) {
  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-box-seam fs-5"></i>
        <h5 className="mb-0">Detalle del Insumo</h5>
      </Card.Header>
      <Card.Body className="p-4">
        <div className="bg-light p-3 rounded border mb-2">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">ID / Código:</span>
            <span className="col-8"><Badge bg="secondary">#{insumo.id}</Badge></span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Nombre:</span>
            <span className="col-8 fw-bold">{insumo.nombre}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Cantidad:</span>
            <span className="col-8">{insumo.cantidad}</span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Unidad de Medida:</span>
            <span className="col-8">
              {insumo.unidadMedidaObj 
                ? `${insumo.unidadMedidaObj.sufijo}` 
                : `ID: ${insumo.unidad_medida_id}`}
            </span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Estado:</span>
            <span className="col-8">
               {insumo.activo ? <Badge bg="success">Activo</Badge> 
                : <Badge bg="danger">Inactivo</Badge>}
            </span>
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