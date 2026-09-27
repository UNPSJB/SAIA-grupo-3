import { Table, Card, Button, Badge, Pagination } from 'react-bootstrap';
import { useAuditoria } from './useAuditoria';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { PlanRealizado } from './types';

interface AuditoriaListProps {
  onViewClick: (plan: PlanRealizado) => void;
}

function formatearFecha(fechaIso: string) {
  return new Date(fechaIso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function AuditoriaList({ onViewClick }: AuditoriaListProps) {
  const { planesRealizados, loading, error, page, totalPages, total, nextPage, prevPage, changePage } = useAuditoria();

  if (loading && planesRealizados.length === 0) return <LoadingSpinner mensaje="Cargando historial..." />;
  if (error) return <ErrorAlert mensaje={error} />;

  return (
    <Card className="shadow-sm border-0">
      <Card.Body className="p-0">
        <Table striped hover responsive className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th>ID Ejecución</th>
              <th>Fecha de Ejecución</th>
              <th>Plan Original</th>
              <th>Responsable (DNI)</th>
              <th className="text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {planesRealizados.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4 text-muted">No hay registros de planes realizados.</td></tr>
            ) : (
              planesRealizados.map((p) => (
                <tr key={p.id}>
                  <td><Badge bg="secondary">#{p.id}</Badge></td>
                  <td>{formatearFecha(p.fecha_ejecucion)}</td>
                  <td><strong>{p.nombre}</strong></td>
                  <td>{p.responsable_id}</td>
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