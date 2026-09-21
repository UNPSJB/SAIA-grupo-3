import { useState } from 'react';
import { Card, Button, Alert, Badge } from 'react-bootstrap';
import type { Equipo } from './types';
import { TIPOS_EQUIPOS } from './types';

interface EquipoDeleteViewProps {
  equipo: Equipo;
  onConfirmarEliminar: (id: number) => Promise<void>;
  onCancelar: () => void;
}

export function EquipoDeleteView({
  equipo,
  onConfirmarEliminar,
  onCancelar,
}: EquipoDeleteViewProps) {
  const [eliminando, setEliminando] = useState(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

  const etiquetaTipo =
    TIPOS_EQUIPOS.find((t) => t.value === equipo.tipo)?.label ?? equipo.tipo;

  const handleEliminar = async () => {
    if (equipo.id === undefined) return;
    setEliminando(true);
    setErrorBackend(null);
    try {
      await onConfirmarEliminar(equipo.id);
    } catch (err: unknown) {
      setErrorBackend(
        err instanceof Error ? err.message : 'Error al procesar la baja del equipo.'
      );
      setEliminando(false);
    }
  };

  return (
    <Card className="border-danger shadow-sm mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-danger text-white d-flex align-items-center gap-2 py-3">
        <i className="bi bi-exclamation-triangle-fill fs-5"></i>
        <h5 className="mb-0">Dar de Baja Equipo</h5>
      </Card.Header>
      <Card.Body className="p-4">
        {errorBackend && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-x-circle-fill fs-5"></i>
            <div>{errorBackend}</div>
          </Alert>
        )}
        <p className="text-secondary fs-6">
          ¿Estás seguro de que deseas dar de baja este equipo del inventario activo?
        </p>
        <div className="bg-light p-3 rounded border mb-4">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">N° de Serie:</span>
            <span className="col-8 fw-bold font-monospace">{equipo.numero_serie}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Nombre:</span>
            <span className="col-8">{equipo.nombre}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Tipo:</span>
            <span className="col-8">
              <Badge bg="secondary">{etiquetaTipo}</Badge>
            </span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Sector:</span>
            <span className="col-8">Sector #{equipo.sector_id}</span>
          </div>
        </div>
        <Alert variant="warning" className="small mb-0">
          <i className="bi bi-info-circle me-1"></i>
          <strong>Atención:</strong> Esta acción aplicará una baja lógica; el equipo dejará de estar visible en el inventario activo pero no se borrará físicamente.
        </Alert>
      </Card.Body>
      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
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