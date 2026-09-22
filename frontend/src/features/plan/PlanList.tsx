import { Table, Card, Button, Badge, Pagination } from 'react-bootstrap';
import { usePlan } from './usePlan';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';

interface PlanListProps {
  onNuevoClick: () => void;
}

export function PlanList({ onNuevoClick }: PlanListProps) {
  const { planes, loading, error, page, totalPages, total, nextPage, prevPage, changePage } = usePlan();

  if (loading) return <LoadingSpinner mensaje="Cargando planes..." />;
  if (error) return <ErrorAlert mensaje={error} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 text-secondary">Planes de Limpieza</h4>
        <Button variant="success" size="sm" onClick={onNuevoClick} className="d-flex align-items-center gap-1 shadow-sm">
          <i className="bi bi-plus-lg"></i><span>Nuevo Plan</span>
        </Button>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Frecuencia</th>
                <th>Destino</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {planes.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4 text-muted">No hay planes registrados.</td></tr>
              ) : (
                planes.map((p) => (
                  <tr key={p.id}>
                    <td><Badge bg="secondary">#{p.id}</Badge></td>
                    <td><strong>{p.nombre}</strong></td>
                    <td className="text-capitalize">{p.frecuencia}</td>
                    <td>
                      {p.equipo_id ? `Equipo #${p.equipo_id}` : `Sector #${p.sector_id}`}
                    </td>
                    <td className="text-center">
                      <Button variant="primary" size="sm" className="text-white py-1 px-2 shadow-sm" title="Ver (Próximamente)">
                        <i className="bi bi-eye-fill"></i>
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
    </>
  );
}