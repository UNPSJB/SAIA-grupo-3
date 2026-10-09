import { SortableHeader } from '../../shared/components/SortableHeader';
import { ListPagination } from '../../shared/components/ListPagination';
import { permissions } from '../../shared/libreria/permissions';
import { ListControls } from '../../shared/components/ListControls';
import { Table, Card, Button, Badge, Form } from 'react-bootstrap';
import { useElemento } from './useElemento';
import { useAuth } from '../../shared/hooks/useAuth';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Elemento } from './types';

interface ElementoListProps {
  onNuevoClick: () => void;
  onViewClick: (elemento: Elemento) => void;
  onEditarClick: (elemento: Elemento) => void;
  onEliminarClick: (elemento: Elemento) => void;
}

export function ElementoList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
}: ElementoListProps) {
  // 1. Extraemos el usuario actual
  const { currentUser } = useAuth();

  // 2. Extraemos las herramientas de los elementos
  const {
    elementos,
    loading,
    error,
    page,
    totalPages,
    total,
    changePage,
    mostrarInactivos,
    setMostrarInactivos,
    guardar,
    registrarRecambio,
    ordenarPor,
    orden,
    cambiarOrden,
    busqueda,
    setBusqueda,
  } = useElemento();

  // Función Semáforo para evaluar la fecha
  const getEstadoAlerta = (fechaProximo: string | null | undefined) => {
    if (!fechaProximo) return null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizamos a las 00:00

    // Parseamos la fecha 'YYYY-MM-DD' preservando la zona horaria local
    const [year, month, day] = fechaProximo.split('-');
    const proximo = new Date(Number(year), Number(month) - 1, Number(day));

    const diffTime = proximo.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { variante: 'danger', texto: 'Vencido' };
    if (diffDays <= 5)
      return { variante: 'warning', texto: 'Próximo a vencer', extraClass: 'text-dark' };
    return { variante: 'success', texto: 'Vigente' };
  };

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando listado..." />}
      {error && <ErrorAlert mensaje={error} />}
      <ListControls busqueda={busqueda} setBusqueda={setBusqueda} title="Inventario de Elementos">
        <Form.Check
          type="switch"
          id="switch-inactivos"
          label="Ver dados de baja"
          checked={mostrarInactivos}
          onChange={(e) => setMostrarInactivos(e.target.checked)}
          className="text-secondary mb-0"
        />

        {/* Ocultamos el botón "Nuevo" si no es administrador */}
        {permissions(currentUser).canAdmin && (
          <Button
            variant="success"
            onClick={onNuevoClick}
            className="d-flex align-items-center gap-1 shadow-sm"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Nuevo Elemento</span>
          </Button>
        )}
      </ListControls>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <SortableHeader
                  column="nombre"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Nombre
                </SortableHeader>
                <SortableHeader
                  column="frecuencia_recambio"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Frecuencia
                </SortableHeader>
                <SortableHeader
                  column="fecha_proximo_recambio"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Alerta Vencimiento
                </SortableHeader>
                <SortableHeader
                  column="activo"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Estado
                </SortableHeader>
                <th className="text-center" style={{ width: '150px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {elementos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    No hay elementos registrados para los filtros actuales.
                  </td>
                </tr>
              ) : (
                elementos.map((e) => {
                  const alerta = getEstadoAlerta(e.fecha_proximo_recambio);
                  return (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.nombre}</strong>
                      </td>
                      <td>
                        {e.frecuencia_recambio ? (
                          `${e.frecuencia_recambio} días`
                        ) : (
                          <span className="text-muted">No definida</span>
                        )}
                      </td>

                      {/* COLUMNA ALERTA (SEMÁFORO) */}
                      <td>
                        {alerta ? (
                          <div>
                            <Badge
                              bg={alerta.variante}
                              className={`mb-1 ${alerta.extraClass || ''}`}
                            >
                              {alerta.texto}
                            </Badge>
                            <br />
                            <small className="text-muted">Vence: {e.fecha_proximo_recambio}</small>
                          </div>
                        ) : (
                          <span className="text-muted small">Sin seguimiento</span>
                        )}
                      </td>

                      <td>
                        {e.activo ? (
                          <Badge bg="success">Activo</Badge>
                        ) : (
                          <Badge bg="danger">Inactivo</Badge>
                        )}
                      </td>

                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          {e.activo ? (
                            <>
                              {/* Botones PÚBLICOS (Ver y Recambio) */}
                              <Button
                                variant="info"
                                size="sm"
                                className="text-white py-1 px-2 shadow-sm"
                                title="Registrar Recambio Físico Hoy"
                                onClick={async () => {
                                  if (
                                    confirm(
                                      `¿Registrar que se cambió el elemento: ${e.nombre} en la fecha de hoy?`,
                                    )
                                  ) {
                                    try {
                                      if (e.id) await registrarRecambio(e.id);
                                    } catch (err: unknown) {
                                      alert(err instanceof Error ? err.message : 'Error.');
                                    }
                                  }
                                }}
                              >
                                <i className="bi bi-arrow-repeat"></i>
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                className="text-white py-1 px-2 shadow-sm"
                                title="Ver Detalle"
                                onClick={() => onViewClick(e)}
                              >
                                <i className="bi bi-eye-fill"></i>
                              </Button>

                              {/* Botones RESTRINGIDOS (Editar y Eliminar, solo Admins) */}
                              {permissions(currentUser).canAdmin && (
                                <>
                                  <Button
                                    variant="warning"
                                    size="sm"
                                    className="text-white py-1 px-2 shadow-sm"
                                    title="Modificar"
                                    onClick={() => onEditarClick(e)}
                                  >
                                    <i className="bi bi-pencil-fill"></i>
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    className="py-1 px-2 shadow-sm"
                                    title="Eliminar"
                                    onClick={() => onEliminarClick(e)}
                                  >
                                    <i className="bi bi-trash3-fill"></i>
                                  </Button>
                                </>
                              )}
                            </>
                          ) : (
                            // Si está inactivo, solo el admin puede reactivarlo
                            <>
                              {permissions(currentUser).canAdmin && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  className="py-1 px-2 shadow-sm"
                                  title="Reactivar elemento"
                                  onClick={async () => {
                                    if (confirm(`¿Reactivar el elemento ${e.nombre}?`)) {
                                      try {
                                        await guardar({ ...e, activo: true }, e.id);
                                      } catch (err: unknown) {
                                        alert(
                                          err instanceof Error
                                            ? err.message
                                            : 'Error al reactivar.',
                                        );
                                      }
                                    }
                                  }}
                                >
                                  <i className="bi bi-arrow-counterclockwise me-1"></i> Reactivar
                                </Button>
                              )}
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
