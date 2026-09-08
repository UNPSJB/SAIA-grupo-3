import { Table, Card, Button, Badge } from 'react-bootstrap';
import { usePersonal } from './usePersonal';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Personal } from './types';

interface PersonalListProps {
  onNuevoClick: () => void;
  onEditarClick: (personal: Personal) => void;
  onEliminarClick: (personal: Personal) => void;
}

export function PersonalList({ onNuevoClick, onEditarClick, onEliminarClick }: PersonalListProps) {
  const { personal, loading, error } = usePersonal();

  if (loading) return <LoadingSpinner mensaje="Cargando personal..." />;
  if (error) return <ErrorAlert mensaje={error} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 text-secondary">Nómina del Personal</h4>
        <Button variant="success" size="sm" onClick={onNuevoClick} className="d-flex align-items-center gap-1 shadow-sm">
          <i className="bi bi-plus-lg"></i>
          <span>Nuevo Empleado</span>
        </Button>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Legajo</th>
                <th>DNI</th>
                <th>Apellido y Nombre</th>
                <th>Email</th>
                <th className="text-center" style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {personal.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    No hay personal registrado en el sistema.
                  </td>
                </tr>
              ) : (
                personal.map((p) => (
                  <tr key={p.dni}>
                    <td><Badge bg="secondary">#{p.nroLegajo}</Badge></td>
                    <td>{p.dni}</td>
                    <td><strong>{p.apellido}, {p.nombre}</strong></td>
                    <td>{p.email}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <Button variant="warning" size="sm" className="text-white py-1 px-2 shadow-sm" title="Modificar" onClick={() => onEditarClick(p)}>
                          <i className="bi bi-pencil-fill"></i>
                        </Button>
                        <Button variant="danger" size="sm" className="py-1 px-2 shadow-sm" title="Eliminar" onClick={() => onEliminarClick(p)}>
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