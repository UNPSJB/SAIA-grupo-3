import { SortableHeader } from '../../shared/components/SortableHeader';
import { ListPagination } from '../../shared/components/ListPagination';
import { ListControls } from '../../shared/components/ListControls';
import { Table, Card, Button, Badge } from 'react-bootstrap';
import { useTarea } from './useTarea';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Tarea } from './types';

interface TareaListProps {
  onNuevoClick: () => void;
  onViewClick: (tarea: Tarea) => void;
  onEditarClick: (tarea: Tarea) => void;
  onEliminarClick: (tarea: Tarea) => void;
}

export function TareaList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
}: TareaListProps) {
  const {
    tareas,
    loading,
    error,
    page,
    totalPages,
    total,
    changePage,
    busqueda,
    setBusqueda,
    ordenarPor,
    orden,
    cambiarOrden,
  } = useTarea();

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando listado..." />}
      {error && <ErrorAlert mensaje={error} />}
      <ListControls busqueda={busqueda} setBusqueda={setBusqueda} title="Nómina de Tareas">
        <Button
          variant="success"

          onClick={onNuevoClick}
          className="d-flex align-items-center gap-1 shadow-sm"
        >
          <i className="bi bi-plus-lg"></i>
          <span>Nueva Tarea</span>
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
                  column="frecuencia"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Frecuencia
                </SortableHeader>
                <SortableHeader
                  column="equipo_id"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Equipo
                </SortableHeader>
                <th className="text-center" style={{ width: '120px' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {tareas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    No hay tareas registradas.
                  </td>
                </tr>
              ) : (
                tareas.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Badge bg="secondary">#{t.id}</Badge>
                    </td>
                    <td>
                      <strong>{t.nombre}</strong>
                    </td>
                    <td className="text-capitalize">{t.frecuencia}</td>
                    <td>{t.equipo ? t.equipo.nombre : <span className="text-muted">N/A</span>}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="text-white py-1 px-2 shadow-sm"
                          onClick={() => onViewClick(t)}
                        >
                          <i className="bi bi-eye-fill"></i>
                        </Button>
                        <Button
                          variant="warning"
                          size="sm"
                          className="text-white py-1 px-2 shadow-sm"
                          onClick={() => onEditarClick(t)}
                        >
                          <i className="bi bi-pencil-fill"></i>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="py-1 px-2 shadow-sm"
                          onClick={() => onEliminarClick(t)}
                        >
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
