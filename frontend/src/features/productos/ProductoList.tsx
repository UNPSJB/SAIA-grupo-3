import { Badge, Button, Card, Form, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { ListControls } from '../../shared/components/ListControls';
import { ListPagination } from '../../shared/components/ListPagination';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { SortableHeader } from '../../shared/components/SortableHeader';
import type { Producto } from './types';
import { useProducto } from './useProducto';

interface ProductoListProps {
  onNuevoClick: () => void;
  onViewClick: (producto: Producto) => void;
  onEditarClick: (producto: Producto) => void;
  onEliminarClick: (producto: Producto) => void;
}

export function ProductoList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
}: ProductoListProps) {
  const {
    productos,
    loading,
    error,
    page,
    totalPages,
    total,
    changePage,
    mostrarInactivos,
    setMostrarInactivos,
    ordenarPor,
    orden,
    cambiarOrden,
    busqueda,
    setBusqueda,
    guardar,
  } = useProducto();

  const reactivar = async (producto: Producto) => {
    if (!confirm(`¿Reactivar el producto ${producto.nombre}?`)) return;
    try {
      await guardar({ activo: true }, producto.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al reactivar.');
    }
  };

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando listado..." />}
      {error && <ErrorAlert mensaje={error} />}
      <ListControls busqueda={busqueda} setBusqueda={setBusqueda} title="Catálogo de Productos">
        <Form.Check
          type="switch"
          id="productos-inactivos"
          label="Ver dados de baja"
          checked={mostrarInactivos}
          onChange={(e) => setMostrarInactivos(e.target.checked)}
          className="text-secondary mb-0"
        />
        <Button
          variant="success"
          onClick={onNuevoClick}
          className="d-flex align-items-center gap-1 shadow-sm"
        >
          <i className="bi bi-plus-lg"></i>
          <span>Nuevo Producto</span>
        </Button>
      </ListControls>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-theme">
              <tr>
                <SortableHeader
                  column="nombre"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Nombre
                </SortableHeader>
                <th>Descripción</th>
                <th>Unidad</th>
                <SortableHeader
                  column="activo"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Estado
                </SortableHeader>
                <th className="text-center" style={{ width: '140px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    {busqueda
                      ? 'No hay productos para la búsqueda.'
                      : 'No hay productos registrados.'}
                  </td>
                </tr>
              ) : (
                productos.map((producto) => (
                  <tr key={producto.id}>
                    <td>
                      <strong>{producto.nombre}</strong>
                    </td>
                    <td className="text-break">
                      {producto.descripcion ?? <span className="text-muted">—</span>}
                    </td>
                    <td>{producto.unidad_medida.sufijo}</td>
                    <td>
                      <Badge bg={producto.activo ? 'success' : 'danger'}>
                        {producto.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        {producto.activo ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              title="Ver detalle"
                              onClick={() => onViewClick(producto)}
                            >
                              <i className="bi bi-eye-fill"></i>
                            </Button>
                            <Button
                              variant="warning"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              title="Modificar"
                              onClick={() => onEditarClick(producto)}
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="py-1 px-2 shadow-sm"
                              title="Dar de baja"
                              onClick={() => onEliminarClick(producto)}
                            >
                              <i className="bi bi-trash3-fill"></i>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="success"
                            size="sm"
                            className="py-1 px-2 shadow-sm"
                            onClick={() => void reactivar(producto)}
                          >
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
          <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-body border-top">
            <ListPagination
              page={page}
              totalPages={totalPages}
              total={total}
              changePage={changePage}
            />
          </Card.Footer>
        )}
      </Card>
    </>
  );
}
