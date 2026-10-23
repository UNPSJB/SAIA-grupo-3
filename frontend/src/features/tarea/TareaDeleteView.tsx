import { useState } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import type { Tarea } from './types';

interface TareaDeleteViewProps {
  tarea: Tarea;
  onConfirmarEliminar: (id: number) => Promise<void>;
  onCancelar: () => void;
}

export function TareaDeleteView({ tarea, onConfirmarEliminar, onCancelar }: TareaDeleteViewProps) {
  const [eliminando, setEliminando] = useState(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

  const handleEliminar = async () => {
    if (tarea.id === undefined) return;
    setEliminando(true);
    try {
      await onConfirmarEliminar(tarea.id);
    } catch (err: unknown) {
      setErrorBackend(err instanceof Error ? err.message : 'Error al eliminar.');
      setEliminando(false);
    }
  };

  return (
    <Card className="border-danger shadow-sm mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-danger text-white d-flex align-items-center gap-2 py-3">
        <i className="bi bi-exclamation-triangle-fill fs-5"></i>
        <h5 className="mb-0">Eliminar Tarea</h5>
      </Card.Header>
      <Card.Body className="p-4">
        {errorBackend && <Alert variant="danger">{errorBackend}</Alert>}
        <p className="text-secondary fs-6">¿Deseas eliminar esta tarea permanentemente?</p>
        <div className="bg-body-tertiary p-3 rounded border mb-4">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Nombre:</span>
            <span className="col-8 fw-bold">{tarea.nombre}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Frecuencia:</span>
            <span className="col-8 text-capitalize">{tarea.frecuencia}</span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Equipo:</span>
            <span className="col-8">{tarea.equipo ? tarea.equipo.nombre : 'Ninguno'}</span>
          </div>
        </div>
      </Card.Body>
      <Card.Footer className="bg-body border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onCancelar} disabled={eliminando}>Cancelar</Button>
        <Button variant="danger" onClick={handleEliminar} disabled={eliminando}>
          {eliminando ? 'Eliminando...' : 'Confirmar Eliminación'}
        </Button>
      </Card.Footer>
    </Card>
  );
}