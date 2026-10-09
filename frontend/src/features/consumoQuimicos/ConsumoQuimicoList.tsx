import { SortableHeader } from '../../shared/components/SortableHeader';
import { ListPagination } from '../../shared/components/ListPagination';
import { ListControls } from '../../shared/components/ListControls';
import { Table, Card, Button, Badge, Form } from 'react-bootstrap';
import { useConsumoQuimico } from './useConsumoQuimico';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { ConsumoQuimico } from './types';

interface ConsumoQuimicoListProps {
  onNuevoClick: () => void;
  onViewClick: (consumo: ConsumoQuimico) => void;
  onEditarClick: (consumo: ConsumoQuimico) => void;
  onEliminarClick: (consumo: ConsumoQuimico) => void;
}

export function ConsumoQuimicoList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
}: ConsumoQuimicoListProps) {
  const {
    consumos,
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
    guardarConsumo,
    busqueda,
    setBusqueda,
  } = useConsumoQuimico();

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando listado..." />}
      {error && <ErrorAlert mensaje={error} />}
      <ListControls busqueda={busqueda} setBusqueda={setBusqueda} title="Nómina de Consumos (POES)">
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
          <span>Registrar Consumo</span>
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
                  column="fecha"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Fecha
                </SortableHeader>
                <SortableHeader
                  column="insumo_quimico_id"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Producto Químico
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
                  column="tarea_limpieza"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Tarea de Limpieza
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
              {consumos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No hay consumos registrados.
                  </td>
                </tr>
              ) : (
                consumos.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Badge bg="secondary" className="font-monospace px-2 py-1">
                        #{item.id}
                      </Badge>
                    </td>
                    <td>{item.fecha}</td>
                    <td>
                      <strong>{item.insumo?.nombre || `ID: ${item.insumo_quimico_id}`}</strong>
                    </td>
                    <td>{item.cantidad_utilizada}</td>
                    <td>{item.tarea_limpieza}</td>
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
                              <i className="bi bi-trash-fill"></i>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="success"
                            size="sm"
                            className="py-1 px-2 shadow-sm"
                            onClick={async () => {
                              if (
                                confirm(
                                  `¿Reactivar el consumo #${item.id}? Se volverá a descontar el stock del insumo.`,
                                )
                              ) {
                                try {
                                  await guardarConsumo({ ...item, activo: true }, item.id);
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
