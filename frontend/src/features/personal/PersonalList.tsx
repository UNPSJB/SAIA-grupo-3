import { SortableHeader } from '../../shared/components/SortableHeader';
import { ListPagination } from '../../shared/components/ListPagination';
import { ListControls } from '../../shared/components/ListControls';
import { Table, Card, Button, Badge, Form } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { usePersonal } from './usePersonal';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Personal } from './types';

interface PersonalListProps {
  onNuevoClick: () => void;
  onViewClick: (personal: Personal) => void;
  onEditarClick: (personal: Personal) => void;
  onEliminarClick: (personal: Personal) => void;
}

export function PersonalList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
}: PersonalListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const proximosAVencer = searchParams.get('vencimiento') === 'proximos';

  const {
    personal,
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
  } = usePersonal(proximosAVencer);

  const cambiarFiltroVencimiento = (activo: boolean) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (activo) next.set('vencimiento', 'proximos');
        else next.delete('vencimiento');
        next.set('page', '1');
        return next;
      },
      { replace: true },
    );
  };

  const getCapacidad = (p: Personal) => {
    if (p.operar && p.administrar) {
      return { label: 'Operar y administrar', variant: 'success' };
    }

    if (p.operar) {
      return { label: 'Operar', variant: 'info' };
    }

    if (p.administrar) {
      return { label: 'Administrar', variant: 'primary' };
    }

    return { label: 'Sin permisos', variant: 'secondary' };
  };

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando listado..." />}
      {error && <ErrorAlert mensaje={error} />}
      <ListControls busqueda={busqueda} setBusqueda={setBusqueda} title="Nómina del Personal">
        <Form.Check
          type="switch"
          id="switch-vencimientos-personal"
          label={
            <>
              <i className="bi bi-exclamation-triangle-fill text-warning me-1"></i>Próximos a vencer
            </>
          }
          checked={proximosAVencer}
          onChange={(e) => cambiarFiltroVencimiento(e.target.checked)}
          className="text-secondary mb-0"
        />
        <Form.Check
          type="switch"
          id="switch-inactivos-personal"
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
          <span>Nuevo Empleado</span>
        </Button>
      </ListControls>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <SortableHeader
                  column="nroLegajo"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Legajo
                </SortableHeader>
                <SortableHeader
                  column="dni"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  DNI
                </SortableHeader>
                <SortableHeader
                  column="apellido"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Apellido y Nombre
                </SortableHeader>
                <SortableHeader
                  column="email"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Email
                </SortableHeader>
                <th>Permisos</th>
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
              {personal.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    {proximosAVencer
                      ? 'No hay personal con documentación vencida o por vencer.'
                      : 'No hay personal registrado para los filtros actuales.'}
                  </td>
                </tr>
              ) : (
                personal.map((p) => {
                  const capacidad = getCapacidad(p);

                  return (
                    <tr key={p.id}>
                      <td>
                        <Badge bg="secondary">#{p.nroLegajo}</Badge>
                      </td>
                      <td>{p.dni}</td>
                      <td>
                        <strong>
                          {p.apellido}, {p.nombre}
                        </strong>
                      </td>
                      <td>{p.email}</td>
                      <td>
                        <Badge bg={capacidad.variant}>{capacidad.label}</Badge>
                      </td>
                      <td>
                        {p.activo === false ? (
                          <Badge bg="danger">Inactivo</Badge>
                        ) : (
                          <Badge bg="success">Activo</Badge>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          {p.activo === false ? (
                            <Button
                              variant="success"
                              size="sm"
                              className="py-1 px-2 shadow-sm"
                              title="Reactivar Empleado"
                              onClick={async () => {
                                if (confirm(`¿Reactivar a ${p.apellido}, ${p.nombre}?`)) {
                                  try {
                                    await guardar({ ...p, activo: true }, p.id);
                                  } catch (err: unknown) {
                                    alert(
                                      err instanceof Error
                                        ? err.message
                                        : 'Error al reactivar el personal.',
                                    );
                                  }
                                }
                              }}
                            >
                              <i className="bi bi-arrow-counterclockwise me-1"></i>
                              Reactivar
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                className="text-white py-1 px-2 shadow-sm"
                                title="Ver"
                                onClick={() => onViewClick(p)}
                              >
                                <i className="bi bi-eye-fill"></i>
                              </Button>

                              <Button
                                variant="warning"
                                size="sm"
                                className="text-white py-1 px-2 shadow-sm"
                                title="Modificar"
                                onClick={() => onEditarClick(p)}
                              >
                                <i className="bi bi-pencil-fill"></i>
                              </Button>

                              <Button
                                variant="danger"
                                size="sm"
                                className="py-1 px-2 shadow-sm"
                                title="Eliminar"
                                onClick={() => onEliminarClick(p)}
                              >
                                <i className="bi bi-trash3-fill"></i>
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
