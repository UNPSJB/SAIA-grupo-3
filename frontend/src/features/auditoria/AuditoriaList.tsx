import { SortableHeader } from '../../shared/components/SortableHeader';
import { ListPagination } from '../../shared/components/ListPagination';
import { ListControls } from '../../shared/components/ListControls';
import { Table, Card, Button, Badge, Form } from 'react-bootstrap';
import { useAuditoria } from './useAuditoria';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { PlanRealizado } from './types';

interface AuditoriaListProps {
  onViewClick: (plan: PlanRealizado) => void;
}

function formatearFecha(fechaIso: string) {
  return new Date(fechaIso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function AuditoriaList({ onViewClick }: AuditoriaListProps) {
  const {
    planesRealizados,
    loading,
    error,
    page,
    totalPages,
    total,
    changePage,
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
  } = useAuditoria();

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando listado..." />}
      {error && <ErrorAlert mensaje={error} />}
      <ListControls busqueda={busqueda} setBusqueda={setBusqueda} />
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <div className="d-flex flex-wrap align-items-end gap-3 p-3 border-bottom">
            <div>
              <Form.Label htmlFor="historial-desde" className="small text-muted mb-1">
                Desde
              </Form.Label>
              <Form.Control
                id="historial-desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                style={{ maxWidth: '170px' }}
              />
            </div>
            <div>
              <Form.Label htmlFor="historial-hasta" className="small text-muted mb-1">
                Hasta
              </Form.Label>
              <Form.Control
                id="historial-hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                style={{ maxWidth: '170px' }}
              />
            </div>
            <Button
              variant="outline-secondary"
              onClick={limpiarFiltros}
              disabled={!desde && !hasta}
              className="d-flex align-items-center gap-1"
            >
              <i className="bi bi-x-lg"></i>
              <span>Limpiar</span>
            </Button>
          </div>
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <SortableHeader
                  column="id"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  ID Ejecución
                </SortableHeader>
                <SortableHeader
                  column="fecha_ejecucion"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Fecha de Ejecución
                </SortableHeader>
                <SortableHeader
                  column="nombre"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Plan Original
                </SortableHeader>
                <th>Responsable</th>
                <th className="text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {planesRealizados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    {desde || hasta
                      ? 'No hay registros en el rango de fechas seleccionado.'
                      : 'No hay registros de planes realizados.'}
                  </td>
                </tr>
              ) : (
                planesRealizados.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Badge bg="secondary">#{p.id}</Badge>
                    </td>
                    <td>{formatearFecha(p.fecha_ejecucion)}</td>
                    <td>
                      <strong>{p.nombre}</strong>
                    </td>
                    <td>
                      <div>
                        {p.responsable.apellido}, {p.responsable.nombre}
                      </div>
                      <small className="text-muted">DNI {p.responsable.dni}</small>
                    </td>
                    <td className="text-center">
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-white py-1 px-2 shadow-sm"
                        onClick={() => onViewClick(p)}
                        title="Ver Detalle de Tareas"
                      >
                        <i className="bi bi-eye-fill me-1"></i> Ver Detalles
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
        {totalPages > 0 && (
          <Card.Footer className="d-flex justify-content-between align-items-center bg-white border-top">
            <ListPagination
              page={page}
              totalPages={totalPages}
              total={total}
              changePage={changePage}
            />
          </Card.Footer>
        )}
      </Card>
    </>
  );
}
