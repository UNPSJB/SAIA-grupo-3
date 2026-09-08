import { Table, Card, Button, Badge } from 'react-bootstrap';
import { usePersonal } from './usePersonal';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Personal } from './types';
import { TIPOS_CAPACIDAD } from './types';

interface PersonalListProps {
  onNuevoClick: () => void;
  onViewClick: (personal: Personal) => void;
  onEditarClick: (personal: Personal) => void;
  onEliminarClick: (personal: Personal) => void;
}

export function PersonalList({ onNuevoClick, onViewClick, onEditarClick, onEliminarClick }: PersonalListProps) {
  const { personal, loading, error } = usePersonal();

  const getLabelCapacidad = (valor: Personal['tipo_capacidad']) => {
    const encontrado = TIPOS_CAPACIDAD.find((t) => t.value === valor);
    return encontrado ? encontrado.label : valor;
  };

  const getBadgeVariant = (valor: Personal['tipo_capacidad']) => {
    switch (valor) {
      case 'administrar': return 'primary';
      case 'operar': return 'info';
      case 'operar_administrar': return 'success';
      default: return 'secondary';
    }
  };

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
                <th>Capacidad</th>
                <th className="text-center" style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {personal.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
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
                    <td>
                      <Badge bg={getBadgeVariant(p.tipo_capacidad)}>
                        {getLabelCapacidad(p.tipo_capacidad)}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">                      
                        <Button variant="primary" size="sm" className="text-white py-1 px-2 shadow-sm" title="Ver" onClick={() => onViewClick(p)}>
                          <i className="bi bi-eye-fill"></i>
                        </Button>
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