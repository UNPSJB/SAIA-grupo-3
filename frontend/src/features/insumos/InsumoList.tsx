import { SortableHeader } from '../../shared/components/SortableHeader';
import { ListPagination } from '../../shared/components/ListPagination';
import { ListControls } from '../../shared/components/ListControls';
import { Table, Card, Button, Badge, Form } from 'react-bootstrap';
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

export function InsumoList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
}: InsumoListProps) {
  const {
    insumos,
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
    guardar,
    busqueda,
    setBusqueda,
  } = useInsumo();

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando listado..." />}
      {error && <ErrorAlert mensaje={error} />}
      <ListControls busqueda={busqueda} setBusqueda={setBusqueda} title="Nómina de Insumos">
        <Form.Check
          type="switch"
          id="switch-inactivos"
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
          <span>Nuevo Insumo</span>
        </Button>
      </ListControls>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <SortableHeader
                  column="id"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  ID
                </SortableHeader>
                <SortableHeader
                  column="nombre"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Nombre
                </SortableHeader>
                <SortableHeader
                  column="cantidad"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Cantidad
                </SortableHeader>
                <SortableHeader
                  column="unidad_medida_id"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Unidad de Medida
                </SortableHeader>
                <SortableHeader
                  column="activo"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Estado
                </SortableHeader>
                <th className="text-center" style={{ width: '120px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {insumos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    No hay insumos registrados.
                  </td>
                </tr>
              ) : (
                insumos.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Badge bg="secondary" className="font-monospace">
                        #{item.id}
                      </Badge>
                    </td>
                    <td>
                      <strong>{item.nombre}</strong>
                    </td>
                    <td>{item.cantidad}</td>
                    <td>
                      {item.unidadMedidaObj
                        ? `${item.unidadMedidaObj.sufijo}`
                        : `ID: ${item.unidad_medida_id}`}
                    </td>
                    <td>
                      {item.activo ? (
                        <Badge bg="success">Activo</Badge>
                      ) : (
                        <Badge bg="danger">Inactivo</Badge>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        {item.activo ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              onClick={() => onViewClick(item)}
                            >
                              <i className="bi bi-eye-fill"></i>
                            </Button>
                            <Button
                              variant="warning"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              onClick={() => onEditarClick(item)}
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="py-1 px-2 shadow-sm"
                              onClick={() => onEliminarClick(item)}
                            >
                              <i className="bi bi-trash3-fill"></i>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="success"
                            size="sm"
                            className="py-1 px-2 shadow-sm"
                            onClick={async () => {
                              if (confirm(`¿Reactivar el insumo ${item.nombre}?`)) {
                                try {
                                  await guardar({ activo: true }, item.id);
                                } catch (err: unknown) {
                                  alert(err instanceof Error ? err.message : 'Error al reactivar.');
                                }
                              }
                            }}
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
          <Card.Footer className="d-flex flex-column flex-md-row justify-content-between align-items-center bg-white border-top">
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
