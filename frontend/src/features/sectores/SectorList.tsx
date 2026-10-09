import { SortableHeader } from '../../shared/components/SortableHeader';
import { ListPagination } from '../../shared/components/ListPagination';
import { ListControls } from '../../shared/components/ListControls';
import { Table, Card, Button, Badge, Form } from 'react-bootstrap';
import { useSector } from './useSector';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Sector } from './types';

interface SectorListProps {
  onNuevoClick: () => void;
  onViewClick: (sector: Sector) => void;
  onEditarClick: (sector: Sector) => void;
  onEliminarClick: (sector: Sector) => void;
}

export function SectorList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
}: SectorListProps) {
  const {
    sectores,
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
  } = useSector();

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando listado..." />}
      {error && <ErrorAlert mensaje={error} />}
      <ListControls busqueda={busqueda} setBusqueda={setBusqueda} title="Nómina de Sectores">
        <Form.Check
          type="switch"
          id="switch-inactivos-sectores"
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
          <span>Nuevo Sector</span>
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
                  Nombre del Sector
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
              {sectores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">
                    No hay sectores registrados.
                  </td>
                </tr>
              ) : (
                sectores.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Badge bg="secondary" className="font-monospace px-2 py-1">
                        #{s.id}
                      </Badge>
                    </td>
                    <td>
                      <strong>{s.nombre}</strong>
                    </td>
                    <td>
                      {s.activo ? (
                        <Badge bg="success">Activo</Badge>
                      ) : (
                        <Badge bg="danger">Inactivo</Badge>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        {s.activo ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              title="Ver"
                              onClick={() => onViewClick(s)}
                            >
                              <i className="bi bi-eye-fill"></i>
                            </Button>
                            <Button
                              variant="warning"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              title="Modificar"
                              onClick={() => onEditarClick(s)}
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="py-1 px-2 shadow-sm"
                              title="Eliminar"
                              onClick={() => onEliminarClick(s)}
                            >
                              <i className="bi bi-trash-fill"></i>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="success"
                            size="sm"
                            className="py-1 px-2 shadow-sm"
                            title="Reactivar"
                            onClick={async () => {
                              if (confirm(`¿Reactivar el sector ${s.nombre}?`)) {
                                try {
                                  await guardar({ ...s, activo: true }, s.id);
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
