import { Button, Card, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { formatearFecha } from '../../shared/libreria/fechas';
import type { ConsumoRecepcion, LoteRecepcion } from '../abastecimiento/types';
import './TrazabilidadInsumosView.css';

interface TrazabilidadInsumosViewProps {
  busqueda: string;
  lotes: LoteRecepcion[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
  onBusquedaChange: (busqueda: string) => void;
  onPageChange: (page: number) => void;
  onVerDetalles: (loteId: number) => void;
  onVolver: () => void;
  loteSeleccionado: LoteRecepcion | null;
  usos: ConsumoRecepcion[] | null;
  loadingDetalle: boolean;
  errorDetalle: string | null;
}

export function TrazabilidadInsumosView({
  busqueda,
  lotes,
  total,
  page,
  pages,
  loading,
  error,
  onBusquedaChange,
  onPageChange,
  onVerDetalles,
  onVolver,
  loteSeleccionado,
  usos,
  loadingDetalle,
  errorDetalle,
}: TrazabilidadInsumosViewProps) {
  return (
    <div>
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
        <h2 className="mb-0 border-bottom pb-2 text-secondary flex-grow-1">
          Trazabilidad de insumos
        </h2>
        {loteSeleccionado && usos && (
          <Button
            variant="primary"
            className="d-print-none flex-shrink-0"
            onClick={() => window.print()}
          >
            <i className="bi bi-printer-fill me-1" aria-hidden="true"></i>
            Imprimir
          </Button>
        )}
      </div>

      {!loteSeleccionado && (
        <p className="text-muted mb-4">
          Consultá el origen de cada lote y las producciones en las que se utilizó.
        </p>
      )}

      {!loteSeleccionado && (
        <>
          {error && <ErrorAlert mensaje={error} />}
          <Card className="shadow-sm border-0 mb-4 d-print-none">
            <Card.Header className="bg-body-tertiary text-secondary traza-insumos-toolbar">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-box-seam fs-5" aria-hidden="true"></i>
                <h5 className="mb-0">Recepciones</h5>
                {(!loading || lotes.length > 0) && (
                  <span className="traza-insumos-count">{total}</span>
                )}
                {loading && (
                  <Spinner animation="border" size="sm" role="status" aria-label="Actualizando recepciones" />
                )}
              </div>
              <div className="traza-insumos-search">
                <div className="traza-insumos-search-field">
                  <i className="bi bi-search text-muted" aria-hidden="true"></i>
                  <Form.Control
                    id="buscar-lote-insumo"
                    type="search"
                    aria-label="Buscar por número de lote, insumo o proveedor"
                    value={busqueda}
                    onChange={(evento) => onBusquedaChange(evento.target.value)}
                    placeholder="Buscar lote, insumo o proveedor…"
                    autoComplete="off"
                    size="sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline-success"
                  size="sm"
                  onClick={() => onBusquedaChange('')}
                  disabled={!busqueda}
                >
                  Limpiar
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped hover responsive className="align-middle mb-0 traza-insumos-table">
                <thead className="table-theme">
                  <tr>
                    <th>Lote del proveedor</th>
                    <th>Insumo</th>
                    <th>Proveedor</th>
                    <th>Recepción</th>
                    <th className="text-end">Disponible</th>
                    <th className="text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && !error && lotes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        {busqueda
                          ? 'No se encontraron recepciones que coincidan con la búsqueda.'
                          : 'No hay recepciones de insumos registradas.'}
                      </td>
                    </tr>
                  )}
                    {lotes.map((lote) => (
                      <tr key={lote.id}>
                        <td>{lote.numero_lote}</td>
                        <td>
                          {lote.insumo_nombre.endsWith(' · DEMO abastecimiento') ? (
                            <>
                              {lote.insumo_nombre.slice(0, -' · DEMO abastecimiento'.length)}
                              <small className="d-block text-muted">DEMO abastecimiento</small>
                            </>
                          ) : lote.insumo_nombre}
                        </td>
                        <td>{lote.proveedor_nombre}</td>
                        <td>{formatearFecha(lote.fecha_recepcion)}</td>
                        <td className="text-end">
                          {lote.cantidad_disponible.toLocaleString('es-AR')} {lote.unidad}
                        </td>
                        <td className="text-center">
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-nowrap"
                            aria-label={`Ver detalle del lote ${lote.numero_lote}`}
                            onClick={() => onVerDetalles(lote.id)}
                          >
                            <i className="bi bi-eye-fill me-1" aria-hidden="true"></i>
                            Ver detalle
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 p-3 border-top">
                {total > 0 && (
                  <small className="text-muted">
                    Página {page} de {pages} ({total} registros)
                  </small>
                )}
                {pages > 1 && (
                  <Pagination className="mb-0 flex-wrap">
                    {Array.from({ length: pages }, (_, indice) => indice + 1).map((numero) => (
                      <Pagination.Item
                        key={numero}
                        active={numero === page}
                        onClick={() => onPageChange(numero)}
                      >
                        {numero}
                      </Pagination.Item>
                    ))}
                  </Pagination>
                )}
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      {loteSeleccionado && (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Header className="bg-body-tertiary text-secondary d-flex align-items-center gap-2 py-3">
            <i className="bi bi-upc-scan fs-5" aria-hidden="true"></i>
            <h5 className="mb-0">Trazabilidad del lote {loteSeleccionado.numero_lote}</h5>
          </Card.Header>
          <Card.Body>
            <Row className="g-3 mb-4">
              <Col xs={12} md={6}>
                <span className="text-muted fw-semibold">Insumo: </span>
                {loteSeleccionado.insumo_nombre}
              </Col>
              <Col xs={12} md={6}>
                <span className="text-muted fw-semibold">Proveedor: </span>
                {loteSeleccionado.proveedor_nombre}
              </Col>
              <Col xs={12} md={6}>
                <span className="text-muted fw-semibold">Fecha de recepción: </span>
                {formatearFecha(loteSeleccionado.fecha_recepcion)}
              </Col>
              <Col xs={12} md={6}>
                <span className="text-muted fw-semibold">Fecha de vencimiento: </span>
                {formatearFecha(loteSeleccionado.fecha_vencimiento)}
              </Col>
              <Col xs={12} md={6}>
                <span className="text-muted fw-semibold">Cantidad recibida: </span>
                {loteSeleccionado.cantidad.toLocaleString('es-AR')} {loteSeleccionado.unidad}
              </Col>
              <Col xs={12} md={6}>
                <span className="text-muted fw-semibold">Cantidad disponible: </span>
                {loteSeleccionado.cantidad_disponible.toLocaleString('es-AR')}{' '}
                {loteSeleccionado.unidad}
              </Col>
            </Row>

            {errorDetalle && <ErrorAlert mensaje={errorDetalle} />}
            {loadingDetalle && <LoadingSpinner mensaje="Cargando trazabilidad..." />}
            {!loadingDetalle && usos && (
              <>
                <h6 className="fw-bold border-bottom pb-2">Lotes de producción asociados</h6>
                {usos.length === 0 ? (
                  <p className="text-muted small py-3 text-center border rounded bg-body-tertiary mb-0">
                    Este lote de insumo todavía no fue utilizado en producción.
                  </p>
                ) : (
                  <Table striped hover responsive className="align-middle mb-0">
                    <thead className="table-theme">
                      <tr>
                        <th>Lote de producción</th>
                        <th>Producto</th>
                        <th>Fecha de producción</th>
                        <th className="text-end">Cantidad utilizada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usos.map((uso) => (
                        <tr key={uso.lote_produccion_id}>
                          <td>
                            <Link to={`/lotes-produccion/${uso.lote_produccion_id}`}>
                              {uso.codigo}
                            </Link>
                          </td>
                          <td>{uso.producto}</td>
                          <td>{formatearFecha(uso.fecha_produccion)}</td>
                          <td className="text-end">
                            {uso.cantidad_utilizada.toLocaleString('es-AR')}{' '}
                            {loteSeleccionado.unidad}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </>
            )}
          </Card.Body>
          <Card.Footer className="bg-body border-top-0 d-flex justify-content-end pb-4 px-4">
            <Button variant="secondary" onClick={onVolver}>
              Volver al listado
            </Button>
          </Card.Footer>
        </Card>
      )}
    </div>
  );
}
