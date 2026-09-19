import { Table, Card, Button, Badge, Pagination } from 'react-bootstrap';
import { useEquipo } from './useEquipo';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Equipo, TipoEquipo } from './types';
import { TIPOS_EQUIPOS } from './types';

interface EquipoListProps {
  onNuevoClick: () => void;
  onViewClick: (equipo: Equipo) => void;
  onEditarClick: (equipo: Equipo) => void;
  onEliminarClick: (equipo: Equipo) => void;
}

export function EquipoList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
}: EquipoListProps) {
  const { 
    equipos, loading, error,
    page, totalPages, total, nextPage, prevPage, changePage 
  } = useEquipo();

  const getLabelTipo = (valor: TipoEquipo) => {
    const encontrado = TIPOS_EQUIPOS.find((t) => t.value === valor);
    return encontrado ? encontrado.label : valor;
  };

  const getBadgeVariant = (valor: TipoEquipo) => {
    switch (valor) {
      case 'equipo': return 'primary';
      case 'herramienta': return 'warning';
      case 'instrumento': return 'info';
      default: return 'secondary';
    }
  };

  if (loading) return <LoadingSpinner mensaje="Cargando equipos..." />;
  if (error) return <ErrorAlert mensaje={error} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 text-secondary">Inventario de Equipos</h4>
        <Button
          variant="success"
          size="sm"
          onClick={onNuevoClick}
          className="d-flex align-items-center gap-1 shadow-sm"
        >
          <i className="bi bi-plus-lg"></i>
          <span>Nuevo Equipo</span>
        </Button>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            {/* ... el thead se mantiene igual ... */}
            <thead className="table-light">
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Ubicación</th>
                <th className="text-center" style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {equipos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    No hay equipos registrados en el sistema.
                  </td>
                </tr>
              ) : (
                equipos.map((e) => (
                  <tr key={e.id}>
                    <td><Badge bg="secondary">#{e.id}</Badge></td>
                    <td><strong>{e.nombre}</strong></td>
                    <td>
                      <Badge bg={getBadgeVariant(e.tipo)}>
                        {getLabelTipo(e.tipo)}
                      </Badge>
                    </td>
                    <td>{e.ubicacion}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <Button variant="primary" size="sm" className="text-white py-1 px-2 shadow-sm" title="Ver" onClick={() => onViewClick(e)}>
                          <i className="bi bi-eye-fill"></i>
                        </Button>
                        <Button variant="warning" size="sm" className="text-white py-1 px-2 shadow-sm" title="Modificar" onClick={() => onEditarClick(e)}>
                          <i className="bi bi-pencil-fill"></i>
                        </Button>
                        <Button variant="danger" size="sm" className="py-1 px-2 shadow-sm" title="Eliminar" onClick={() => onEliminarClick(e)}>
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
                <Pagination.Item 
                  key={num} 
                  active={num === page} 
                  onClick={() => changePage(num)}
                >
                  {num}
                </Pagination.Item>
              ))}
              <Pagination.Next onClick={nextPage} disabled={page === totalPages} />
            </Pagination>
          </Card.Footer>
        )}
      </Card>
    </>
  );
}