import { SortableHeader } from '../../shared/components/SortableHeader';
import { ListPagination } from '../../shared/components/ListPagination';
import { ListControls } from '../../shared/components/ListControls';
import { Table, Card, Button, Badge, Form } from 'react-bootstrap';
import { usePlan } from './usePlan';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Plan } from './types';

interface PlanListProps {
  onNuevoClick: () => void;
  onViewClick: (plan: Plan) => void;
  onEditarClick: (plan: Plan) => void;
  onEliminarClick: (plan: Plan) => void;
}

export function PlanList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
}: PlanListProps) {
  const {
    planes,
    loading,
    error,
    page,
    totalPages,
    total,
    changePage,
    mostrarInactivos,
    setMostrarInactivos,
    guardar,
    busqueda,
    setBusqueda,
    ordenarPor,
    orden,
    cambiarOrden,
  } = usePlan();

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando listado..." />}
      {error && <ErrorAlert mensaje={error} />}
      <ListControls busqueda={busqueda} setBusqueda={setBusqueda} title="Planes de Limpieza">
        <Form.Check
          type="switch"
          id="switch-inactivos-planes"
          label="Ver finalizados/inactivos"
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
          <span>Nuevo Plan</span>
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
                  column="descripcion"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Descripción
                </SortableHeader>
                <SortableHeader
                  column="fecha_inicio"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Inicio
                </SortableHeader>
                <SortableHeader
                  column="fecha_fin"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Fin
                </SortableHeader>
                <SortableHeader
                  column="activo"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Estado
                </SortableHeader>
                <th className="text-center" style={{ width: '130px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {planes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No hay planes registrados.
                  </td>
                </tr>
              ) : (
                planes.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Badge bg="secondary">#{p.id}</Badge>
                    </td>
                    <td>
                      <strong>{p.nombre}</strong>
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '200px' }}>
                      {p.descripcion}
                    </td>
                    <td>{p.fecha_inicio || 'N/A'}</td>
                    <td>{p.fecha_fin || 'N/A'}</td>
                    <td>
                      {p.activo ? (
                        <Badge bg="success">Activo</Badge>
                      ) : (
                        <Badge bg="danger">Inactivo</Badge>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        {p.activo ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              onClick={() => onViewClick(p)}
                              title="Ver"
                            >
                              <i className="bi bi-eye-fill"></i>
                            </Button>
                            <Button
                              variant="warning"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              onClick={() => onEditarClick(p)}
                              title="Modificar"
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="py-1 px-2 shadow-sm"
                              onClick={() => onEliminarClick(p)}
                              title="Dar de baja"
                            >
                              <i className="bi bi-trash3-fill"></i>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="success"
                            size="sm"
                            className="py-1 px-2 shadow-sm"
                            onClick={() => guardar({ ...p, activo: true }, p.id)}
                            title="Reactivar"
                          >
                            <i className="bi bi-arrow-counterclockwise"></i> Reactivar
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
          <Card.Footer className="d-flex justify-content-between align-items-center bg-white border-top">
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
