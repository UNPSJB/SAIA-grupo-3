import { Table, Card, Button, Badge } from 'react-bootstrap';
import { useInsumo } from './useInsumo';
import type { Insumo } from './types';

interface InsumoListProps {
  onNuevoClick: () => void;
  onViewClick: (insumo: Insumo) => void;
  onEditarClick: (insumo: Insumo) => void;
  onEliminarClick: (insumo: Insumo) => void;
}

export function InsumoList({ onNuevoClick, onViewClick, onEditarClick, onEliminarClick }: InsumoListProps) {
  const { insumos, loading, error } = useInsumo();

  if (loading) return <div className="p-4 text-center text-muted">Cargando insumos...</div>;
  if (error) return <div className="p-4 text-danger">{error}</div>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 text-secondary">Nómina de Insumos</h4>
        <Button variant="success" size="sm" onClick={onNuevoClick} className="d-flex align-items-center gap-1 shadow-sm">
          <i className="bi bi-plus-lg"></i>
          <span>Nuevo Insumo</span>
        </Button>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Cantidad</th>
                <th>Unidad de Medida</th>
                <th className="text-center" style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {insumos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    No hay insumos registrados en el sistema.
                  </td>
                </tr>
              ) : (
                insumos.map((item) => (
                  <tr key={item.id}>
                    <td><Badge bg="secondary">#{item.id}</Badge></td>
                    <td><strong>{item.nombre}</strong></td>
                    <td>{item.cantidad}</td>
                    <td>
                      {item.unidadMedidaObj 
                        ? `${item.unidadMedidaObj.sufijo}` 
                        : `ID: ${item.unidad_medida_id}`}
                    </td>
                    <td className="text-center">
                     <div className="d-flex justify-content-center gap-2">                      
                       <Button variant="primary" size="sm" className="text-white py-1 px-2 shadow-sm" title="Ver" onClick={() => onViewClick(item)}>
                         <i className="bi bi-eye-fill"></i>
                        </Button>
                        <Button variant="warning" size="sm" className="text-white py-1 px-2 shadow-sm" title="Modificar" onClick={() => onEditarClick(item)}>
                         <i className="bi bi-pencil-fill"></i>
                       </Button>
                       <Button variant="danger" size="sm" className="py-1 px-2 shadow-sm" title="Eliminar" onClick={() => onEliminarClick(item)}>
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