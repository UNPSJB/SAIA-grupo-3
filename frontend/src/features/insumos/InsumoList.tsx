import { Table, Card, Button, Badge, Pagination, Form } from 'react-bootstrap';
import { useInsumo } from './useInsumo';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Insumo } from './types';

interface InsumoListProps {
  onNuevoClick: () => void;
  onViewClick: (insumo: Insumo) => void;
  onEditarClick: (insumo: Insumo) => void;
  onEliminarClick: (insumo: Insumo) => void;
}

export function InsumoList({ onNuevoClick, onViewClick, onEditarClick, onEliminarClick }: InsumoListProps) {
  const { 
    insumos, loading, error, page, totalPages, total,
    nextPage, prevPage, changePage, mostrarInactivos, setMostrarInactivos,
    ordenarPor, orden, cambiarOrden, guardar, busqueda
  } = useInsumo();

  const renderIconoOrden = (columna: string) => {
    if (ordenarPor !== columna) return <i className="bi bi-chevron-expand text-muted ms-1" style={{ fontSize: '0.8rem' }}></i>;
    return orden === 'asc' ? <i className="bi bi-chevron-up ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i> : <i className="bi bi-chevron-down ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i>;
  };

  if (loading && page === 1 && !busqueda) return <LoadingSpinner mensaje="Cargando insumos..." />;
  if (error) return <ErrorAlert mensaje={error} />;

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h4 className="text-secondary fw-normal mb-0 mt-md-2">Nómina de Insumos</h4>
        <div className="d-flex flex-wrap align-items-center gap-3">
          <Form.Check 
            type="switch" id="switch-inactivos" label="Ver dados de baja"
            checked={mostrarInactivos} onChange={(e) => setMostrarInactivos(e.target.checked)}
            className="text-secondary mb-0"
          />
          <Button variant="success" size="sm" onClick={onNuevoClick} className="d-flex align-items-center gap-1 shadow-sm">
            <i className="bi bi-plus-lg"></i><span>Nuevo Insumo</span>
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
           <thead className="table-light">
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => cambiarOrden('id')}>
                  ID {renderIconoOrden('id')}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => cambiarOrden('nombre')}>
                  Nombre {renderIconoOrden('nombre')}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => cambiarOrden('cantidad')}>
                  Cantidad {renderIconoOrden('cantidad')}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => cambiarOrden('unidad_medida_id')}>
                  Unidad de Medida {renderIconoOrden('unidad_medida_id')}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => cambiarOrden('activo')}>
                  Estado {renderIconoOrden('activo')}
                </th>
                <th className="text-center" style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {insumos.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-muted">No hay insumos registrados.</td></tr>
              ) : (
                insumos.map((item) => (
                  <tr key={item.id} className={!item.activo ? 'opacity-50' : ''}>
                    <td><Badge bg="secondary" className="font-monospace">#{item.id}</Badge></td>
                    <td><strong>{item.nombre}</strong></td>
                    <td>{item.cantidad}</td>
                    <td>{item.unidadMedidaObj ? `${item.unidadMedidaObj.sufijo}` : `ID: ${item.unidad_medida_id}`}</td>
                    <td>{item.activo ? <Badge bg="success">Activo</Badge> : <Badge bg="danger">Inactivo</Badge>}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        {item.activo ? (
                          <>
                            <Button variant="primary" size="sm" className="text-white py-1 px-2 shadow-sm" onClick={() => onViewClick(item)}><i className="bi bi-eye-fill"></i></Button>
                            <Button variant="warning" size="sm" className="text-white py-1 px-2 shadow-sm" onClick={() => onEditarClick(item)}><i className="bi bi-pencil-fill"></i></Button>
                            <Button variant="danger" size="sm" className="py-1 px-2 shadow-sm" onClick={() => onEliminarClick(item)}><i className="bi bi-trash3-fill"></i></Button>
                          </>
                   ) : (
                          <Button variant="success" size="sm" className="py-1 px-2 shadow-sm" onClick={async () => {
                              if (confirm(`¿Reactivar el insumo ${item.nombre}?`)) {
                                try { 
                                  await guardar({ activo: true }, item.id); 
                                } 
                                catch (err: unknown) { 
                                  alert(err instanceof Error ? err.message : 'Error al reactivar.'); 
                                }
                              }
                            }}>
                            <i className="bi bi-arrow-counterclockwise me-1"></i> Reactivar
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
          <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-white border-top">
            <span className="text-muted small mb-2 mb-md-0">Mostrando página {page} de {totalPages} ({total} registros en total)</span>
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