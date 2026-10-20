import { useState } from 'react';
import { Alert, Badge, Button, Card } from 'react-bootstrap';
import type { TipoIncidente } from './types';

interface TipoIncidenteDeleteViewProps {
  tipoIncidente: TipoIncidente;
  onConfirmarEliminar: (id: number) => Promise<void>;
  onCancelar: () => void;
}

export function TipoIncidenteDeleteView({
  tipoIncidente,
  onConfirmarEliminar,
  onCancelar,
}: TipoIncidenteDeleteViewProps) {
  const [eliminando, setEliminando] = useState(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

  const handleEliminar = async () => {
    setEliminando(true);
    setErrorBackend(null);

    try {
      await onConfirmarEliminar(tipoIncidente.id);
    } catch (err: unknown) {
      setErrorBackend(
        err instanceof Error ? err.message : 'Error al procesar la eliminación.'
      );
      setEliminando(false);
    }
  };

  return (
    <Card className="border-danger shadow-sm mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-danger text-white d-flex align-items-center gap-2 py-3">
        <i className="bi bi-exclamation-triangle-fill fs-5"></i>
        <h5 className="mb-0">Dar de Baja Tipo de Incidente</h5>
      </Card.Header>

      <Card.Body className="p-4">
        {errorBackend && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-x-circle-fill fs-5"></i>
            <div>{errorBackend}</div>
          </Alert>
        )}

        <p className="text-secondary fs-6">
          ¿Estás seguro de que deseas dar de baja este tipo de incidente?
        </p>

        <div className="bg-light p-3 rounded border mb-4">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Nombre:</span>
            <span className="col-8 fw-bold">{tipoIncidente.nombre}</span>
          </div>

          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Color:</span>
            <span className="col-8">
              <Badge bg={tipoIncidente.color}>{tipoIncidente.color}</Badge>
            </span>
          </div>

          <div className="row">
            <span className="col-4 text-muted fw-semibold">Estado:</span>
            <span className="col-8">
              {tipoIncidente.activo ? (
                <Badge bg="success">Activo</Badge>
              ) : (
                <Badge bg="danger">Inactivo</Badge>
              )}
            </span>
          </div>
        </div>

        <Alert variant="warning" className="small mb-0">
          <i className="bi bi-info-circle me-1"></i>
          <strong>Atención:</strong> El tipo quedará inactivo y dejará de estar
          disponible para nuevos incidentes.
        </Alert>
      </Card.Body>

      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button
          variant="secondary"
          onClick={onCancelar}
          disabled={eliminando}
        >
          Cancelar
        </Button>

        <Button
          variant="danger"
          onClick={handleEliminar}
          disabled={eliminando}
        >
          {eliminando ? 'Eliminando...' : 'Confirmar Eliminación'}
        </Button>
      </Card.Footer>
    </Card>
  );
}
