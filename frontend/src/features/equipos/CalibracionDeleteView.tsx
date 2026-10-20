import { useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { EnlaceArchivo } from '../../shared/components/EnlaceArchivo';
import type { Calibracion } from './types';
import { esCertificadoPdf } from './types';
import { formatearFecha } from '../../shared/libreria/fechas';

interface CalibracionDeleteViewProps {
  calibracion: Calibracion;
  onConfirmarEliminar: (id: number) => Promise<void>;
  onCancelar: () => void;
}

export function CalibracionDeleteView({
  calibracion,
  onConfirmarEliminar,
  onCancelar,
}: CalibracionDeleteViewProps) {
  const [eliminando, setEliminando] = useState(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

  const handleEliminar = async () => {
    setEliminando(true);
    setErrorBackend(null);

    try {
      await onConfirmarEliminar(calibracion.id);
    } catch (err: unknown) {
      setErrorBackend(
        err instanceof Error ? err.message : 'Error al procesar la eliminación.'
      );
      setEliminando(false);
    }
  };

  return (
    <Card className="border-danger shadow-sm mx-auto mt-4" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-danger text-white d-flex align-items-center gap-2 py-3">
        <i className="bi bi-exclamation-triangle-fill fs-5"></i>
        <h5 className="mb-0">Eliminar Calibración</h5>
      </Card.Header>

      <Card.Body className="p-4">
        {errorBackend && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-x-circle-fill fs-5"></i>
            <div>{errorBackend}</div>
          </Alert>
        )}

        <p className="text-secondary fs-6">
          ¿Estás seguro de que deseas quitar esta calibración del historial del equipo?
        </p>

        <div className="bg-light p-3 rounded border mb-4">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Fecha:</span>
            <span className="col-8 fw-bold">{formatearFecha(calibracion.fecha_calibracion)}</span>
          </div>

          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Otorgado por:</span>
            <span className="col-8 text-break">{calibracion.otorgado_por}</span>
          </div>

          <div className="row">
            <span className="col-4 text-muted fw-semibold">Evidencia:</span>
            <span className="col-8">
              <EnlaceArchivo
                ruta={calibracion.certificado_path}
                className="btn btn-outline-primary d-inline-flex align-items-center justify-content-center gap-2 text-nowrap"
              >
                <i className={`bi ${esCertificadoPdf(calibracion.certificado_path) ? 'bi-file-earmark-pdf' : 'bi-image'}`} aria-hidden="true"></i>
                {esCertificadoPdf(calibracion.certificado_path) ? 'Ver PDF' : 'Ver foto'}
              </EnlaceArchivo>
            </span>
          </div>
        </div>

        <Alert variant="warning" className="small mb-0">
          <i className="bi bi-info-circle me-1"></i>
          <strong>Atención:</strong> La calibración deja de figurar en el historial
          del equipo. El certificado se conserva en el servidor como respaldo.
        </Alert>
      </Card.Body>

      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onCancelar} disabled={eliminando}>
          Cancelar
        </Button>

        <Button variant="danger" onClick={handleEliminar} disabled={eliminando}>
          {eliminando ? 'Eliminando...' : 'Confirmar Eliminación'}
        </Button>
      </Card.Footer>
    </Card>
  );
}
