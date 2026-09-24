import { useState } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import type { Plan } from './types';

interface PlanDeleteViewProps {
  plan: Plan;
  onConfirmarEliminar: (id: number) => Promise<void>;
  onCancelar: () => void;
}

export function PlanDeleteView({ plan, onConfirmarEliminar, onCancelar }: PlanDeleteViewProps) {
  const [eliminando, setEliminando] = useState(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

  const handleEliminar = async () => {
    if (plan.id === undefined) return;
    setEliminando(true);
    try {
      await onConfirmarEliminar(plan.id);
    } catch (err: unknown) {
      setErrorBackend(err instanceof Error ? err.message : 'Error al dar de baja.');
      setEliminando(false);
    }
  };

  return (
    <Card className="border-danger shadow-sm mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-danger text-white d-flex align-items-center gap-2 py-3">
        <i className="bi bi-exclamation-triangle-fill fs-5"></i>
        <h5 className="mb-0">Dar de Baja Plan</h5>
      </Card.Header>
      <Card.Body className="p-4">
        {errorBackend && <Alert variant="danger">{errorBackend}</Alert>}
        <p className="text-secondary fs-6">¿Estás seguro de dar de baja este plan? Dejará de estar activo inmediatamente y se registrará la fecha actual como cierre.</p>
        <div className="bg-light p-3 rounded border mb-4">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Nombre:</span>
            <span className="col-8 fw-bold">{plan.nombre}</span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Responsable:</span>
            <span className="col-8">{plan.responsable_id}</span>
          </div>
        </div>
      </Card.Body>
      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onCancelar} disabled={eliminando}>Cancelar</Button>
        <Button variant="danger" onClick={handleEliminar} disabled={eliminando}>
          {eliminando ? 'Procesando...' : 'Confirmar Baja'}
        </Button>
      </Card.Footer>
    </Card>
  );
}