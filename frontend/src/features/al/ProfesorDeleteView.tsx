import { useState } from 'react';
import { Card, Button, Alert, Badge } from 'react-bootstrap';
import type { Profesor } from './types';

interface ProfesorDeleteViewProps {
  profesor: Profesor;
  onConfirmarEliminar: (id: number) => Promise<void>;
  onCancelar: () => void;
}

export function ProfesorDeleteView({
  profesor,
  onConfirmarEliminar,
  onCancelar,
}: ProfesorDeleteViewProps) {
  const [eliminando, setEliminando] = useState(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

  const handleEliminar = async () => {
    setEliminando(true);
    setErrorBackend(null);
    try {
      await onConfirmarEliminar(profesor.id);
    } catch (err: unknown) {
      setErrorBackend(
        err instanceof Error ? err.message : 'Error al procesar la baja del profesor.'
      );
      setEliminando(false);
    }
  };

  return (
    <Card className="border-danger shadow-sm mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-danger text-white d-flex align-items-center gap-2 py-3">
        <i className="bi bi-exclamation-triangle-fill fs-5"></i>
        <h5 className="mb-0">Dar de Baja Profesor</h5>
      </Card.Header>

      <Card.Body className="p-4">
        {errorBackend && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-x-circle-fill fs-5"></i>
            <div>{errorBackend}</div>
          </Alert>
        )}

        <p className="text-secondary fs-6">
          ¿Estás seguro de que deseas eliminar al siguiente docente del sistema académico?
        </p>

        <div className="bg-light p-3 rounded border mb-4">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">ID de Registro:</span>
            <span className="col-8 fw-bold">#{profesor.id}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Apellido y Nombre:</span>
            <span className="col-8">{profesor.nombre}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Correo Electrónico:</span>
            <span className="col-8">{profesor.email}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Departamento:</span>
            <span className="col-8">
              <Badge bg="secondary">Depto #{profesor.departamento_id}</Badge>
            </span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Fecha Ingreso:</span>
            <span className="col-8">
              {profesor.fecha_ingreso
                ? new Date(profesor.fecha_ingreso).toLocaleDateString()
                : 'Sin fecha registrada'}
            </span>
          </div>
        </div>

        <Alert variant="warning" className="small mb-0">
          <i className="bi bi-info-circle me-1"></i>
          <strong>Atención:</strong> Si el profesor tiene cursos asignados a su cargo, el sistema rechazará la eliminación.
        </Alert>
      </Card.Body>

      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onCancelar} disabled={eliminando}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={handleEliminar} disabled={eliminando}>
          {eliminando ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Eliminando...
            </>
          ) : (
            'Confirmar Eliminación'
          )}
        </Button>
      </Card.Footer>
    </Card>
  );
}