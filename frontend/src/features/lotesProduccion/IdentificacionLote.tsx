import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Modal } from 'react-bootstrap';
import { imprimirDocumento } from '../../shared/components/ReporteImpresion';
import { CodigoBarras } from './CodigoBarras';
import { EtiquetaLote } from './EtiquetaLote';
import type { LoteProduccion } from './types';

interface IdentificacionLoteProps {
  lote: LoteProduccion;
}

export function IdentificacionLote({ lote }: IdentificacionLoteProps) {
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const codigoBarras = lote.codigo_barras;

  const copiar = async () => {
    if (!codigoBarras) return;
    try {
      await navigator.clipboard.writeText(codigoBarras);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <>
      <h6 className="fw-bold border-bottom pb-2">Identificación del lote</h6>
      {codigoBarras ? (
        <div className="d-flex flex-wrap align-items-center gap-4 border rounded p-3 mb-4">
          <div className="border rounded bg-white flex-shrink-0">
            <CodigoBarras codigo={codigoBarras} />
          </div>
          <div className="d-flex flex-column gap-2" style={{ flex: '1 1 280px', minWidth: 0 }}>
            <div>
              <span className="text-muted fw-semibold">Código de barras:</span>{' '}
              <span className="font-monospace">{codigoBarras}</span>
            </div>
            <p className="text-body-secondary small mb-0">
              Se generó al registrar el lote. Lo identifica siempre: no cambia aunque se modifique la
              fecha o la cantidad.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Button variant="outline-primary" size="sm" onClick={() => setVistaPrevia(true)}>
                <i className="bi bi-printer me-1" aria-hidden="true"></i> Imprimir etiqueta
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={copiar}>
                <i
                  className={`bi ${copiado ? 'bi-clipboard-check' : 'bi-clipboard'} me-1`}
                  aria-hidden="true"
                ></i>{' '}
                {copiado ? 'Copiado' : 'Copiar código'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-muted small py-3 text-center border rounded bg-body-tertiary mb-4">
          Este lote todavía no tiene código de barras asignado.
        </p>
      )}

      {codigoBarras && (
        <Modal show={vistaPrevia} onHide={() => setVistaPrevia(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title className="fs-5">Etiqueta del lote {lote.codigo}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="d-flex justify-content-center bg-body-tertiary">
            <EtiquetaLote lote={lote} codigoBarras={codigoBarras} />
          </Modal.Body>
          <Modal.Footer>
            <span className="small text-body-secondary me-auto">Tamaño: 100 × 50 mm</span>
            <Button variant="secondary" onClick={() => setVistaPrevia(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => imprimirDocumento('imprimiendo-etiqueta')}>
              <i className="bi bi-printer me-1" aria-hidden="true"></i> Imprimir
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {codigoBarras &&
        createPortal(
          <div className="etiqueta-lote-portal">
            <EtiquetaLote lote={lote} codigoBarras={codigoBarras} />
          </div>,
          document.body,
        )}
    </>
  );
}
