import { Table, Card, Button, Badge, Pagination } from 'react-bootstrap';
import { useTarea } from './useTarea';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Tarea } from './types';

interface TareaListProps {
  onNuevoClick: () => void;
  onViewClick: (tarea: Tarea) => void;
  onEditarClick: (tarea: Tarea) => void;
  onEliminarClick: (tarea: Tarea) => void;
}

export function TareaList({ onNuevoClick, onViewClick, onEditarClick, onEliminarClick }: TareaListProps) {
  const { tareas, loading, error, page, totalPages, total, nextPage, prevPage, changePage } = useTarea();

  if (loading) return <LoadingSpinner mensaje="Cargando tareas..." />;
  if (error) return <ErrorAlert mensaje={error} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 text-secondary">Nómina de Tareas</h4>
        <Button variant="success" size="sm" onClick={onNuevoClick} className="d-flex align-items-center gap-1 shadow-sm">
          <i className="bi bi-plus-lg"></i><span>Nueva Tarea</span>
        </Button>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Nombre</th>
                <th>Frecuencia</th>
                <th>Equipo</th>
                <th className="text-center" style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tareas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">No hay tareas registradas.</td>
                </tr>
              ) : (
                tareas.map((t) => (
                  <tr key={t.id}>
                    <td><Badge bg="secondary">#{t.id}</Badge></td>
                    <td><strong>{t.nombre}</strong></td>
                    <td className="text-capitalize">{t.frecuencia}</td>
                    <td>{t.equipo ? t.equipo.nombre : <span className="text-muted">N/A</span>}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <Button variant="primary" size="sm" className="text-white py-1 px-2 shadow-sm" onClick={() => onViewClick(t)}>
                          <i className="bi bi-eye-fill"></i>
                        </Button>
                        <Button variant="warning" size="sm" className="text-white py-1 px-2 shadow-sm" onClick={() => onEditarClick(t)}>
                          <i className="bi bi-pencil-fill"></i>
                        </Button>
                        <Button variant="danger" size="sm" className="py-1 px-2 shadow-sm" onClick={() => onEliminarClick(t)}>
                          <i className="bi bi-trash3-fill"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>

        {totalPages > 0 && (
          <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-white border-top">
            <span className="text-muted small mb-2 mb-md-0">
              Mostrando página {page} de {totalPages} ({total} registros en total)
            </span>
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