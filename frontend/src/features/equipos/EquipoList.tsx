import { SortableHeader } from '../../shared/components/SortableHeader';
import { ListPagination } from '../../shared/components/ListPagination';
import { ListControls } from '../../shared/components/ListControls';
import { Table, Card, Button, Badge, Form } from 'react-bootstrap';
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
    equipos,
    loading,
    error,
    page,
    totalPages,
    total,
    changePage,
    mostrarInactivos,
    setMostrarInactivos,
    guardar,
    ordenarPor,
    orden,
    cambiarOrden,
    busqueda,
    setBusqueda,
  } = useEquipo();

  const getLabelTipo = (valor: TipoEquipo) => {
    const encontrado = TIPOS_EQUIPOS.find((t) => t.value === valor);
    return encontrado ? encontrado.label : valor;
  };

  const getBadgeVariant = (valor: TipoEquipo) => {
    switch (valor) {
      case 'equipo':
        return 'primary';
      case 'herramienta':
        return 'warning';
      case 'instrumento':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando listado..." />}
      {error && <ErrorAlert mensaje={error} />}
      <ListControls busqueda={busqueda} setBusqueda={setBusqueda} title="Inventario de Equipos">
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
          <span>Nuevo Equipo</span>
        </Button>
      </ListControls>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <SortableHeader
                  column="numero_serie"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  N° de Serie
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
                  column="tipo"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Tipo
                </SortableHeader>
                <SortableHeader
                  column="sector_id"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Sector
                </SortableHeader>
                <th>Estado</th>
                <th className="text-center" style={{ width: '120px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {equipos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    No hay equipos registrados para los filtros actuales.
                  </td>
                </tr>
              ) : (
                equipos.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Badge bg="secondary" className="font-monospace">
                        {e.numero_serie}
                      </Badge>
                    </td>
                    <td>
                      <strong>{e.nombre}</strong>
                    </td>
                    <td>
                      <Badge
                        bg={getBadgeVariant(e.tipo)}
                        className={e.tipo === 'herramienta' ? 'text-dark' : ''}
                      >
                        {getLabelTipo(e.tipo)}
                      </Badge>
                    </td>
                    <td>
                      {e.sector ? (
                        <span className="fw-medium text-dark">{e.sector.nombre}</span>
                      ) : (
                        <span className="text-muted">Sector #{e.sector_id}</span>
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
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              title="Ver Detalle"
                              onClick={() => onViewClick(e)}
                            >
                              <i className="bi bi-eye-fill"></i>
                            </Button>
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
                        ) : (
                          <Button
                            variant="success"
                            size="sm"
                            className="py-1 px-2 shadow-sm"
                            title="Reactivar Equipo"
                            onClick={async () => {
                              if (confirm(`¿Reactivar el equipo ${e.numero_serie}?`)) {
                                try {
                                  await guardar({ ...e, activo: true }, e.id);
                                } catch (err: unknown) {
                                  alert(
                                    err instanceof Error
                                      ? err.message
                                      : 'Error al reactivar el equipo.',
                                  );
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
