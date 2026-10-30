import { Button, Card, Form, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { ListControls } from '../../shared/components/ListControls';
import { ListPagination } from '../../shared/components/ListPagination';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { SortableHeader } from '../../shared/components/SortableHeader';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { fechaHoyIso, formatearFecha } from '../../shared/libreria/fechas';
import { getProductosActivos } from '../productos/productoApi';
import { EstadoLoteBadge } from './EstadoLoteBadge';
import type { LoteProduccion } from './types';
import { useHistorialLotes } from './useHistorialLotes';

interface HistorialLotesListProps {
  onViewClick: (lote: LoteProduccion) => void;
}

export function HistorialLotesList({ onViewClick }: HistorialLotesListProps) {
  const {
    lotes,
    loading,
    error,
    page,
    totalPages,
    total,
    changePage,
    productoId,
    setProductoId,
    desde,
    setDesde,
    hasta,
    setHasta,
    limpiarFiltros,
    busqueda,
    setBusqueda,
    ordenarPor,
    orden,
    cambiarOrden,
  } = useHistorialLotes();
  const productos = useConsulta(getProductosActivos, []);
  const hoy = fechaHoyIso();
  const hayFiltros = !!productoId || !!desde || !!hasta;

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando lotes..." />}
      {error && <ErrorAlert mensaje={error} />}
      {productos.error && <ErrorAlert mensaje={productos.error} />}
      <ListControls busqueda={busqueda} setBusqueda={setBusqueda} />
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <div className="d-flex flex-wrap align-items-end gap-3 p-3 border-bottom">
            <div>
              <Form.Label htmlFor="lotes-producto" className="small text-muted mb-1">
                Producto
              </Form.Label>
              <Form.Select
                id="lotes-producto"
                value={productoId}
                onChange={(e) => setProductoId(e.target.value)}
                style={{ minWidth: '200px' }}
              >
                <option value="">Todos</option>
                {(productos.datos ?? []).map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre}
                  </option>
                ))}
              </Form.Select>
            </div>
            <div>
              <Form.Label htmlFor="lotes-desde" className="small text-muted mb-1">
                Desde
              </Form.Label>
              <Form.Control
                id="lotes-desde"
                type="date"
                value={desde}
                max={hasta || hoy}
                onChange={(e) => setDesde(e.target.value)}
                style={{ maxWidth: '170px' }}
              />
            </div>
            <div>
              <Form.Label htmlFor="lotes-hasta" className="small text-muted mb-1">
                Hasta
              </Form.Label>
              <Form.Control
                id="lotes-hasta"
                type="date"
                value={hasta}
                min={desde || undefined}
                max={hoy}
                onChange={(e) => setHasta(e.target.value)}
                style={{ maxWidth: '170px' }}
              />
            </div>
            <Button
              variant="success"
              onClick={limpiarFiltros}
              disabled={!hayFiltros}
              className="d-flex align-items-center gap-1"
            >
              <i className="bi bi-x-lg"></i>
              <span>Limpiar</span>
            </Button>
          </div>
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-theme">
              <tr>
                <SortableHeader column="codigo" ordenarPor={ordenarPor} orden={orden} cambiarOrden={cambiarOrden}>
                  Código
                </SortableHeader>
                <SortableHeader column="fecha_produccion" ordenarPor={ordenarPor} orden={orden} cambiarOrden={cambiarOrden}>
                  Fecha de producción
                </SortableHeader>
                <SortableHeader column="producto" ordenarPor={ordenarPor} orden={orden} cambiarOrden={cambiarOrden}>
                  Producto
                </SortableHeader>
                <SortableHeader column="cantidad" ordenarPor={ordenarPor} orden={orden} cambiarOrden={cambiarOrden} className="text-end">
                  Cantidad
                </SortableHeader>
                <th>Estado</th>
                <th className="text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {lotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    {hayFiltros
                      ? 'No hay lotes que coincidan con los filtros.'
                      : 'No hay lotes registrados.'}
                  </td>
                </tr>
              ) : (
                lotes.map((lote) => (
                  <tr key={lote.id}>
                    <td>
                      <strong>{lote.codigo}</strong>
                    </td>
                    <td>{formatearFecha(lote.fecha_produccion)}</td>
                    <td>{lote.producto.nombre}</td>
                    <td className="text-end">
                      {lote.cantidad.toLocaleString('es-AR')} {lote.producto.unidad_medida.sufijo}
                    </td>
                    <td>
                      <EstadoLoteBadge estado={lote.estado} />
                    </td>
                    <td className="text-center">
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-white py-1 px-2 shadow-sm"
                        onClick={() => onViewClick(lote)}
                        title="Ver detalle del lote"
                      >
                        <i className="bi bi-eye-fill me-1"></i> Ver detalle
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
        {totalPages > 0 && (
          <Card.Footer className="d-flex justify-content-between align-items-center bg-body border-top">
            <ListPagination page={page} totalPages={totalPages} total={total} changePage={changePage} />
          </Card.Footer>
        )}
      </Card>
    </>
  );
}
