import { useCallback, useState } from 'react';
import { Alert, Badge, Button, Card, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ListPagination } from '../../shared/components/ListPagination';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { formatearFecha } from '../../shared/libreria/fechas';
import { listarLotes } from './abastecimientoApi';
import { EstadoLote } from './EstadoLote';
import { useConsulta } from './useConsulta';

export function ProveedorLotes({ proveedorId }: { proveedorId: number }) {
  const [page, setPage] = useState(1);
  const cargar = useCallback(
    (signal: AbortSignal) =>
      listarLotes({ proveedor_id: proveedorId, mostrar_inactivos: true, page, size: 10 }, signal),
    [proveedorId, page],
  );
  const consulta = useConsulta(cargar);
  return (
    <section
      className="mt-4 mx-auto"
      style={{ maxWidth: '1000px' }}
      aria-labelledby="proveedor-lotes-titulo"
    >
      <h4 id="proveedor-lotes-titulo" className="text-secondary fw-normal mb-3">
        Lotes del Proveedor
      </h4>
      {consulta.cargando && <LoadingSpinner mensaje="Cargando lotes del proveedor..." />}
      {consulta.error && (
        <Alert variant="danger">
          {consulta.error}{' '}
          <Button variant="link" onClick={consulta.recargar}>
            Reintentar
          </Button>
        </Alert>
      )}
      {consulta.datos && (
        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            <Table responsive striped hover className="align-middle mb-0">
              <thead className="table-theme">
                <tr>
                  <th>Insumo / Lote</th>
                  <th>Recepción</th>
                  <th>Recibido</th>
                  <th>Disponible</th>
                  <th>Vencimiento</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {consulta.datos.items.map((lote) => (
                  <tr key={lote.id}>
                    <td>
                      <strong>{lote.insumo_nombre}</strong>
                      <small className="d-block text-body-secondary">{lote.numero_lote}</small>
                      {!lote.activo && <Badge bg="secondary">Anulada</Badge>}
                      {lote.conciliacion && (
                        <Badge bg="secondary" className="ms-1">
                          Stock anterior
                        </Badge>
                      )}
                    </td>
                    <td className="text-nowrap">{formatearFecha(lote.fecha_recepcion)}</td>
                    <td className="text-nowrap">
                      {lote.cantidad} {lote.unidad}
                    </td>
                    <td className="text-nowrap">
                      {lote.cantidad_disponible} {lote.unidad}
                    </td>
                    <td>
                      <div className="text-nowrap mb-1">
                        {formatearFecha(lote.fecha_vencimiento)}
                      </div>
                      <EstadoLote estado={lote.estado_vencimiento} />
                    </td>
                    <td className="text-center">
                      <Link
                        className="btn btn-primary btn-sm py-1 px-2"
                        to={`/recepciones-insumos/${lote.id}`}
                        title="Ver detalle y uso del lote"
                        aria-label={`Ver lote ${lote.numero_lote}`}
                      >
                        <i className="bi bi-eye-fill" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {!consulta.datos.items.length && (
                  <tr>
                    <td colSpan={6} className="text-center text-body-secondary py-4">
                      Este proveedor todavía no tiene lotes registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
          {consulta.datos.pages > 0 && (
            <Card.Footer className="bg-body border-0">
              <ListPagination
                page={page}
                totalPages={consulta.datos.pages}
                total={consulta.datos.total}
                changePage={setPage}
              />
            </Card.Footer>
          )}
        </Card>
      )}
    </section>
  );
}
