import { useState } from 'react';
import { Card, Button, Alert, Badge } from 'react-bootstrap';
import type { Personal } from './types';

interface PersonalDeleteViewProps {
  personal: Personal;
  onConfirmarEliminar: (dni: number) => Promise<void>;
  onCancelar: () => void;
}

export function PersonalDeleteView({ personal, onConfirmarEliminar, onCancelar }: PersonalDeleteViewProps) {
  const [eliminando, setEliminando] = useState(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

  const handleEliminar = async () => {
    setEliminando(true);
    setErrorBackend(null);
    try {
      await onConfirmarEliminar(personal.dni);
    } catch (err: unknown) {
      setErrorBackend(err instanceof Error ? err.message : 'Error al procesar la baja.');
      setEliminando(false);
    }
  };

  return (
    <Card className="border-danger shadow-sm mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-danger text-white d-flex align-items-center gap-2 py-3">
        <i className="bi bi-exclamation-triangle-fill fs-5"></i>
        <h5 className="mb-0">Eliminar Empleado</h5>
      </Card.Header>
      <Card.Body className="p-4">
        {errorBackend && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-x-circle-fill fs-5"></i>
            <div>{errorBackend}</div>
          </Alert>
        )}
        <p className="text-secondary fs-6">¿Estás seguro de que deseas eliminar a esta persona del sistema?</p>
        <div className="bg-light p-3 rounded border mb-4">
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
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Email:</span>
            <span className="col-8">{personal.email}</span>
          </div>
        </div>
        <Alert variant="warning" className="small mb-0">
          <i className="bi bi-info-circle me-1"></i>
          <strong>Atención:</strong> Si el empleado tiene documentación asignada (carnet manipulador, libreta sanitaria, etc.), el sistema rechazará la eliminación.
        </Alert>
      </Card.Body>
      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onCancelar} disabled={eliminando}>Cancelar</Button>
        <Button variant="danger" onClick={handleEliminar} disabled={eliminando}>
          {eliminando ? 'Eliminando...' : 'Confirmar Eliminación'}
        </Button>
      </Card.Footer>
    </Card>
  );
}