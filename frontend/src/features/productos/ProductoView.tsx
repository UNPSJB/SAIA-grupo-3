import { Badge, Button, Card } from 'react-bootstrap';
import type { Producto } from './types';

interface ProductoViewProps {
  producto: Producto;
  onEditar: () => void;
  onVolver: () => void;
}

export function ProductoView({ producto, onEditar, onVolver }: ProductoViewProps) {
  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-body-tertiary text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-basket fs-5"></i>
        <h5 className="mb-0">Detalle del Producto</h5>
      </Card.Header>
      <Card.Body className="p-4">
        <div className="bg-body-tertiary p-3 rounded border">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Nombre:</span>
            <span className="col-8 fw-bold">{producto.nombre}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Descripción:</span>
            <span className="col-8">{producto.descripcion ?? 'Sin descripción'}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Unidad:</span>
            <span className="col-8">{producto.unidad_medida.sufijo}</span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Estado:</span>
            <span className="col-8">
              <Badge bg={producto.activo ? 'success' : 'danger'}>
                {producto.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </span>
          </div>
        </div>
      </Card.Body>
      <Card.Footer className="bg-body border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>
          Volver
        </Button>
        {producto.activo && (
          <Button variant="warning" className="text-white" onClick={onEditar}>
            Modificar
          </Button>
        )}
      </Card.Footer>
    </Card>
  );
}
