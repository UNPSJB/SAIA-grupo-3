import { Table, Card, Button, Badge, Pagination, Form } from 'react-bootstrap';
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
    nextPage,
    prevPage,
    changePage,
    mostrarInactivos,
    setMostrarInactivos,
    guardar,
    ordenarPor,
    orden,
    cambiarOrden,
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

  const renderIconoOrden = (columna: string) => {
    if (ordenarPor !== columna) {
      return <i className="bi bi-chevron-expand text-muted ms-1" style={{ fontSize: '0.8rem' }}></i>;
    }
    return orden === 'asc' ? (
      <i className="bi bi-chevron-up ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i>
    ) : (
      <i className="bi bi-chevron-down ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i>
    );
  };

  if (loading && page === 1) return <LoadingSpinner mensaje="Cargando insumos químicos..." />;
  if (error) return <ErrorAlert mensaje={error} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 text-secondary">Nómina de Insumos Químicos</h4>

        <div className="d-flex align-items-center gap-3">
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
            size="sm"
            onClick={onNuevoClick}
            className="d-flex align-items-center gap-1 shadow-sm"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Nuevo Químico</span>
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none', width: '100px' }} onClick={() => cambiarOrden('id')}>
                  ID {renderIconoOrden('id')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => cambiarOrden('nombre')}>
                  Nombre {renderIconoOrden('nombre')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => cambiarOrden('tipo_quimico')}>
                  Tipo {renderIconoOrden('tipo_quimico')}
                </th>
                <th>Cantidad</th>
                <th>Unidad de Medida</th>
                <th>Estado</th>
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
                  <tr key={item.id} className={!item.activo ? 'opacity-50' : ''}>
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
                        className={item.tipo_quimico === 'detergente' || item.tipo_quimico === 'desengrasante' ? 'text-dark' : ''}
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
            <span className="text-muted small mb-2 mb-md-0">
              Mostrando página {page} de {totalPages} ({total} registros en total)
            </span>
            <Pagination className="mb-0" size="sm">
              <Pagination.Prev onClick={prevPage} disabled={page === 1} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <Pagination.Item
                  key={num}
                  active={num === page}
                  onClick={() => changePage(num)}
                >
                  {num}
                </Pagination.Item>
              ))}
              <Pagination.Next onClick={nextPage} disabled={page === totalPages} />
            </Pagination>
          </Card.Footer>
        )}
      </Card>
    </>
  );
}