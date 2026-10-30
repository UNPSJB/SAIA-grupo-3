import { useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import type { Producto } from './types';

interface ProductoDeleteViewProps {
  producto: Producto;
  onConfirmarEliminar: (id: number) => Promise<void>;
  onCancelar: () => void;
}

export function ProductoDeleteView({
  producto,
  onConfirmarEliminar,
  onCancelar,
}: ProductoDeleteViewProps) {
  const [eliminando, setEliminando] = useState(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

  const handleEliminar = async () => {
    setEliminando(true);
    setErrorBackend(null);
    try {
      await onConfirmarEliminar(producto.id);
    } catch (err: unknown) {
      setErrorBackend(err instanceof Error ? err.message : 'Error al procesar la baja.');
      setEliminando(false);
    }
  };

  return (
    <Card className="border-danger shadow-sm mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-danger text-white d-flex align-items-center gap-2 py-3">
        <i className="bi bi-exclamation-triangle-fill fs-5"></i>
        <h5 className="mb-0">Dar de Baja Producto</h5>
      </Card.Header>
      <Card.Body className="p-4">
        {errorBackend && <Alert variant="danger">{errorBackend}</Alert>}
        <p className="text-secondary fs-6">
          ¿Dar de baja este producto? No se podrán registrar lotes nuevos con él, pero sus lotes
          anteriores se conservan.
        </p>
        <div className="bg-body-tertiary p-3 rounded border">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Nombre:</span>
            <span className="col-8 fw-bold">{producto.nombre}</span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Unidad:</span>
            <span className="col-8">{producto.unidad_medida.sufijo}</span>
          </div>
        </div>
      </Card.Body>
      <Card.Footer className="bg-body border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onCancelar} disabled={eliminando}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={handleEliminar} disabled={eliminando}>
          {eliminando ? 'Procesando baja...' : 'Confirmar Baja'}
        </Button>
      </Card.Footer>
    </Card>
  );
}
