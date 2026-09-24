import { Table, Card, Button, Badge, Pagination, Form } from 'react-bootstrap';
import { usePlan } from './usePlan';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Plan } from './types';

interface PlanListProps {
  onNuevoClick: () => void;
  onViewClick: (plan: Plan) => void;
  onEditarClick: (plan: Plan) => void;
  onEliminarClick: (plan: Plan) => void;
}

export function PlanList({ onNuevoClick, onViewClick, onEditarClick, onEliminarClick }: PlanListProps) {
  const { planes, loading, error, page, totalPages, total, nextPage, prevPage, changePage, mostrarInactivos, setMostrarInactivos, guardar } = usePlan();

  if (loading) return <LoadingSpinner mensaje="Cargando planes..." />;
  if (error) return <ErrorAlert mensaje={error} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 text-secondary">Planes de Limpieza</h4>
        <div className="d-flex align-items-center gap-3">
          <Form.Check 
            type="switch"
            id="switch-inactivos-planes"
            label="Ver finalizados/inactivos"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
            className="text-secondary mb-0"
          />
          <Button variant="success" size="sm" onClick={onNuevoClick} className="d-flex align-items-center gap-1 shadow-sm">
            <i className="bi bi-plus-lg"></i><span>Nuevo Plan</span>
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Fechas</th>
                <th>Estado</th>
                <th className="text-center" style={{ width: '130px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {planes.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-muted">No hay planes registrados.</td></tr>
              ) : (
                planes.map((p) => (
                  <tr key={p.id} className={!p.activo ? 'opacity-50' : ''}>
                    <td><Badge bg="secondary">#{p.id}</Badge></td>
                    <td><strong>{p.nombre}</strong></td>
                    <td className="text-truncate" style={{ maxWidth: '200px' }}>{p.descripcion}</td>
                    <td>
                      <small className="d-block text-muted">Inicio: {p.fecha_inicio || 'N/A'}</small>
                      {!p.activo && <small className="d-block text-danger">Fin: {p.fecha_fin}</small>}
                    </td>
                    <td>
                      {p.activo ? <Badge bg="success">Activo</Badge> : <Badge bg="danger">Inactivo</Badge>}
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        {p.activo ? (
                          <>
                            <Button variant="primary" size="sm" className="text-white py-1 px-2 shadow-sm" onClick={() => onViewClick(p)} title="Ver">
                              <i className="bi bi-eye-fill"></i>
                            </Button>
                            <Button variant="warning" size="sm" className="text-white py-1 px-2 shadow-sm" onClick={() => onEditarClick(p)} title="Modificar">
                              <i className="bi bi-pencil-fill"></i>
                            </Button>
                            <Button variant="danger" size="sm" className="py-1 px-2 shadow-sm" onClick={() => onEliminarClick(p)} title="Dar de baja">
                              <i className="bi bi-trash3-fill"></i>
                            </Button>
                          </>
                        ) : (
                          <Button variant="success" size="sm" className="py-1 px-2 shadow-sm" onClick={() => guardar({ ...p, activo: true }, p.id)} title="Reactivar">
                            <i className="bi bi-arrow-counterclockwise"></i> Reactivar
                          </Button>
                        )}
                      </div>
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