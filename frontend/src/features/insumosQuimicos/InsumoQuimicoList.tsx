import { SortableHeader } from '../../shared/components/SortableHeader';
import { ListPagination } from '../../shared/components/ListPagination';
import { ListControls } from '../../shared/components/ListControls';
import { Table, Card, Button, Badge, Form } from 'react-bootstrap';
import { useInsumoQuimico } from './useInsumoQuimico';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { InsumoQuimico, TipoQuimico } from './types';
import { TIPOS_QUIMICOS } from './types';

interface InsumoQuimicoListProps {
  onNuevoClick: () => void;
  onViewClick: (insumo: InsumoQuimico) => void;
  onEditarClick: (insumo: InsumoQuimico) => void;
  onEliminarClick: (insumo: InsumoQuimico) => void;
}

export function InsumoQuimicoList({
  onNuevoClick,
  onViewClick,
  onEditarClick,
  onEliminarClick,
}: InsumoQuimicoListProps) {
  const {
    insumosQuimicos,
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
  } = useInsumoQuimico();

  const getLabelTipo = (valor: TipoQuimico) => {
    const encontrado = TIPOS_QUIMICOS.find((t) => t.value === valor);
    return encontrado ? encontrado.label : valor;
  };

  const getBadgeVariant = (valor: TipoQuimico) => {
    switch (valor) {
      case 'desinfectante':
        return 'primary';
      case 'detergente':
        return 'info';
      case 'desengrasante':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <>
      {loading && <LoadingSpinner mensaje="Cargando listado..." />}
      {error && <ErrorAlert mensaje={error} />}
      <ListControls
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        title="Nómina de Insumos Químicos"
      >
        <Form.Check
          type="switch"
          id="switch-inactivos-quimicos"
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
          <span>Nuevo Químico</span>
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
                  column="tipo_quimico"
                  ordenarPor={ordenarPor}
                  orden={orden}
                  cambiarOrden={cambiarOrden}
                >
                  Tipo
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
              {insumosQuimicos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No hay insumos químicos registrados para los filtros actuales.
                  </td>
                </tr>
              ) : (
                insumosQuimicos.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Badge bg="secondary" className="font-monospace">
                        #{item.id}
                      </Badge>
                    </td>
                    <td>
                      <strong>{item.nombre}</strong>
                    </td>
                    <td>
                      <Badge
                        bg={getBadgeVariant(item.tipo_quimico)}
                        className={
                          item.tipo_quimico === 'detergente' ||
                          item.tipo_quimico === 'desengrasante'
                            ? 'text-dark'
                            : ''
                        }
                      >
                        {getLabelTipo(item.tipo_quimico)}
                      </Badge>
                    </td>
                    <td>{item.cantidad}</td>
                    <td>{item.unidadMedidaObj?.sufijo ?? `ID: ${item.unidad_medida_id}`}</td>
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
                              title="Ver Detalle"
                              onClick={() => onViewClick(item)}
                            >
                              <i className="bi bi-eye-fill"></i>
                            </Button>
                            <Button
                              variant="warning"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              title="Modificar"
                              onClick={() => onEditarClick(item)}
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="py-1 px-2 shadow-sm"
                              title="Eliminar"
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
                            title="Reactivar Insumo Químico"
                            onClick={async () => {
                              if (confirm(`¿Deseas reactivar el químico ${item.nombre}?`)) {
                                try {
                                  await guardar({ ...item, activo: true }, item.id);
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
