import { Table, Card, Button, Badge } from 'react-bootstrap';
import { useProfesores } from './useProfesores';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Profesor } from './types';

interface ProfesoresListProps {
  onNuevoClick: () => void;
  onEditarClick: (profesor: Profesor) => void;
  onEliminarClick: (profesor: Profesor) => void; // Recibe el profesor a eliminar
}

export function ProfesoresList({
  onNuevoClick,
  onEditarClick,
  onEliminarClick,
}: ProfesoresListProps) {
  const { profesores, loading, error } = useProfesores();

  if (loading) return <LoadingSpinner mensaje="Cargando profesores..." />;
  if (error) return <ErrorAlert mensaje={error} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 text-secondary">Plantel Docente</h4>
        <Button
          variant="success"
          size="sm"
          onClick={onNuevoClick}
          className="d-flex align-items-center gap-1 shadow-sm"
        >
          <i className="bi bi-plus-lg"></i>
          <span>Nuevo Profesor</span>
        </Button>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: '70px' }}>ID</th>
                <th>Apellido y Nombre</th>
                <th>Email</th>
                <th className="text-center" style={{ width: '100px' }}>Depto N°</th>
                <th>Fecha Ingreso</th>
                <th>Estado</th>
                <th className="text-center" style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profesores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No hay profesores registrados.
                  </td>
                </tr>
              ) : (
                profesores.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td><strong>{p.nombre}</strong></td>
                    <td>{p.email}</td>
                    <td className="text-center">
                      <Badge bg="secondary">#{p.departamento_id}</Badge>
                    </td>
                    <td>{p.fecha_ingreso ? new Date(p.fecha_ingreso).toLocaleDateString() : '—'}</td>
                    <td><Badge bg="info">Titular</Badge></td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <Button
                          variant="warning"
                          size="sm"
                          className="text-white py-1 px-2 shadow-sm"
                          title="Modificar profesor"
                          onClick={() => onEditarClick(p)}
                        >
                          <i className="bi bi-pencil-fill"></i>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="py-1 px-2 shadow-sm"
                          title="Eliminar profesor"
                          onClick={() => onEliminarClick(p)}
                        >
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
      </Card>
    </>
  );
}