import { useState } from 'react';
import { Button, Card, Modal } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { formatearFecha, formatearFechaHora } from '../../shared/libreria/fechas';
import { EstadoLoteBadge } from './EstadoLoteBadge';
import { cerrarLoteProduccion } from './loteProduccionApi';
import type { LoteProduccion } from './types';

interface HistorialLoteViewProps {
  lote: LoteProduccion;
  onVolver: () => void;
  onCerrado: () => Promise<void>;
}

export function HistorialLoteView({ lote, onVolver, onCerrado }: HistorialLoteViewProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrar = async () => {
    setCerrando(true);
    setError(null);
    try {
      await cerrarLoteProduccion(lote.id);
      setConfirmando(false);
      await onCerrado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar el lote.');
    } finally {
      setCerrando(false);
    }
  };

  const filas = [
    { titulo: 'Producto', valor: lote.producto.nombre },
    { titulo: 'Fecha de producción', valor: formatearFecha(lote.fecha_produccion) },
    {
      titulo: 'Cantidad',
      valor: `${lote.cantidad.toLocaleString('es-AR')} ${lote.producto.unidad_medida.sufijo}`,
    },
    {
      titulo: 'Registrado por',
      valor: `${lote.registrado_por.apellido}, ${lote.registrado_por.nombre} (${formatearFechaHora(lote.fecha_registro)})`,
    },
    { titulo: 'Observaciones', valor: lote.observaciones ?? '—' },
  ];
  if (lote.estado === 'cerrado' && lote.cerrado_por) {
    filas.push({
      titulo: 'Cerrado por',
      valor: `${lote.cerrado_por.apellido}, ${lote.cerrado_por.nombre} (${formatearFechaHora(lote.fecha_cierre)})`,
    });
  }

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '900px' }}>
      <Card.Header className="bg-body-tertiary text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-box-seam fs-5"></i>
        <h5 className="mb-0">Lote {lote.codigo}</h5>
        <span className="ms-auto">
          <EstadoLoteBadge estado={lote.estado} />
        </span>
      </Card.Header>
      <Card.Body className="p-4">
        {error && <ErrorAlert mensaje={error} />}
        <div className="bg-body-tertiary p-3 rounded border mb-4">
          {filas.map((fila) => (
            <div className="row mb-2" key={fila.titulo}>
              <span className="col-sm-3 text-muted fw-semibold">{fila.titulo}:</span>
              <span className="col-sm-9" style={{ whiteSpace: 'pre-wrap' }}>
                {fila.valor}
              </span>
            </div>
          ))}
        </div>

        <h6 className="fw-bold border-bottom pb-2">Insumos utilizados</h6>
        {lote.insumos_asociados.length === 0 ? (
          <p className="text-muted small py-3 text-center border rounded bg-body-tertiary">
            Este lote no tiene insumos asociados.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Insumo</th>
                  <th className="text-end">Cantidad utilizada</th>
                </tr>
              </thead>
              <tbody>
                {lote.insumos_asociados.map(({ insumo_id, insumo, cantidad_usada }) => (
                  <tr key={insumo_id}>
                    <td>{insumo.nombre}</td>
                    <td className="text-end">
                      {cantidad_usada.toLocaleString('es-AR')} {insumo.unidadMedidaObj.sufijo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card.Body>
      <Card.Footer className="bg-body border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>
          Volver al listado
        </Button>
        {lote.estado === 'abierto' && (
          <Button variant="danger" onClick={() => setConfirmando(true)}>
            <i className="bi bi-lock-fill me-1"></i> Cerrar lote
          </Button>
        )}
      </Card.Footer>

      <Modal show={confirmando} onHide={() => setConfirmando(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Cerrar lote {lote.codigo}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Una vez cerrado, el lote queda de solo lectura: no se podrá modificar ni dar de baja.
          ¿Querés continuar?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmando(false)} disabled={cerrando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={cerrar} disabled={cerrando}>
            {cerrando ? 'Cerrando...' : 'Cerrar lote'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}
