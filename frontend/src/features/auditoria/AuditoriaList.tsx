import { Table, Card, Button, Badge, Pagination, Form } from 'react-bootstrap';
import { useAuditoria } from './useAuditoria';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { PlanRealizado } from './types';

interface AuditoriaListProps {
  onViewClick: (plan: PlanRealizado) => void;
}

function formatearFecha(fechaIso: string) {
  return new Date(fechaIso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

export function AuditoriaList({ onViewClick }: AuditoriaListProps) {
  const { planesRealizados, loading, error, page, totalPages, total, nextPage, prevPage, changePage, desde, setDesde, hasta, setHasta, limpiarFiltros } = useAuditoria();

  if (loading && planesRealizados.length === 0) return <LoadingSpinner mensaje="Cargando historial..." />;
  if (error) return <ErrorAlert mensaje={error} />;

  return (
    <Card className="shadow-sm border-0">
      <Card.Body className="p-0">
        <div className="d-flex flex-wrap align-items-end gap-3 p-3 border-bottom">
          <div>
            <Form.Label htmlFor="historial-desde" className="small text-muted mb-1">Desde</Form.Label>
            <Form.Control id="historial-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ maxWidth: '170px' }} />
          </div>
          <div>
            <Form.Label htmlFor="historial-hasta" className="small text-muted mb-1">Hasta</Form.Label>
            <Form.Control id="historial-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ maxWidth: '170px' }} />
          </div>
          <Button variant="outline-secondary" onClick={limpiarFiltros} disabled={!desde && !hasta} className="d-flex align-items-center gap-1">
            <i className="bi bi-x-lg"></i><span>Limpiar</span>
          </Button>
        </div>
        <Table striped hover responsive className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th>ID Ejecución</th>
              <th>Fecha de Ejecución</th>
              <th>Plan Original</th>
              <th>Responsable</th>
              <th className="text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {planesRealizados.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4 text-muted">{desde || hasta ? 'No hay registros en el rango de fechas seleccionado.' : 'No hay registros de planes realizados.'}</td></tr>
            ) : (
              planesRealizados.map((p) => (
                <tr key={p.id}>
                  <td><Badge bg="secondary">#{p.id}</Badge></td>
                  <td>{formatearFecha(p.fecha_ejecucion)}</td>
                  <td><strong>{p.nombre}</strong></td>
                  <td>
                    <div>{p.responsable.apellido}, {p.responsable.nombre}</div>
                    <small className="text-muted">DNI {p.responsable.dni}</small>
                  </td>
                  <td className="text-center">
                    <Button variant="primary" size="sm" className="text-white py-1 px-2 shadow-sm" onClick={() => onViewClick(p)} title="Ver Detalle de Tareas">
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
          <span className="text-muted small">Página {page} de {totalPages} ({total} registros)</span>
          <Pagination className="mb-0" size="sm">
            <Pagination.Prev onClick={prevPage} disabled={page === 1} />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <Pagination.Item key={num} active={num === page} onClick={() => changePage(num)}>{num}</Pagination.Item>
            ))}
            <Pagination.Next onClick={nextPage} disabled={page === totalPages} />
          </Pagination>
        </Card.Footer>
      )}
    </Card>
  );
}