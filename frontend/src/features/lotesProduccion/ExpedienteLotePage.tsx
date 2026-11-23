import { useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Button, Card, Container } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { imprimirDocumento } from '../../shared/components/ReporteImpresion';
import { useAuth } from '../../shared/hooks/useAuth';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { ExpedienteDocumento } from './ExpedienteDocumento';
import { getExpedienteLote } from './loteProduccionApi';

export function ExpedienteLotePage() {
  const { id } = useParams();
  const loteId = Number(id);
  const { currentUser } = useAuth();
  const [fechaImpresion, setFechaImpresion] = useState<string | null>(null);
  const expediente = useConsulta(() => getExpedienteLote(loteId), [loteId]);
  const datos = expediente.cargando ? null : expediente.datos;

  const descargarPdf = () => {
    flushSync(() => setFechaImpresion(new Date().toISOString()));
    imprimirDocumento('imprimiendo-expediente');
  };

  return (
    <Container className="py-2">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <h2 className="mb-0 border-bottom pb-2 text-secondary flex-grow-1">
          Expediente de trazabilidad
        </h2>
        <div className="d-flex flex-wrap gap-2 flex-shrink-0">
          <Link to={`/lotes/${loteId}`} className="btn btn-secondary">
            Volver al lote
          </Link>
          {datos && (
            <Button variant="primary" onClick={descargarPdf}>
              <i className="bi bi-file-earmark-pdf me-1" aria-hidden="true"></i>
              Descargar PDF
            </Button>
          )}
        </div>
      </div>

      {expediente.error && <ErrorAlert mensaje={expediente.error} />}
      {expediente.cargando && <LoadingSpinner mensaje="Armando el expediente..." />}

      {datos && (
        <>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4 bg-white rounded">
              <ExpedienteDocumento expediente={datos} usuario={currentUser} />
            </Card.Body>
          </Card>
          {createPortal(
            <div className="rep-portal rep-portal-expediente">
              <ExpedienteDocumento
                expediente={datos}
                usuario={currentUser}
                fechaEmision={fechaImpresion}
              />
            </div>,
            document.body,
          )}
        </>
      )}
    </Container>
  );
}
