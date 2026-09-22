import { Table, Card, Button, Badge, Pagination, Form } from 'react-bootstrap';
import { useElemento } from './useElemento';
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
  const {
    elementos, loading, error, page, totalPages, total,
    nextPage, prevPage, changePage, mostrarInactivos,
    setMostrarInactivos, guardar, registrarRecambio,
    ordenarPor, orden, cambiarOrden
  } = useElemento();

  const renderIconoOrden = (columna: string) => {
    if (ordenarPor !== columna) {
      return <i className="bi bi-chevron-expand text-muted ms-1" style={{ fontSize: '0.8rem' }}></i>;
    }
    return orden === 'asc' 
      ? <i className="bi bi-chevron-up ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i>
      : <i className="bi bi-chevron-down ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i>;
  };

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
    if (diffDays <= 5) return { variante: 'warning', texto: 'Próximo a vencer', extraClass: 'text-dark' };
    return { variante: 'success', texto: 'Vigente' };
  };

  if (loading) return <LoadingSpinner mensaje="Cargando elementos..." />;
  if (error) return <ErrorAlert mensaje={error} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0 text-secondary">Inventario de Elementos</h4>
        <div className="d-flex align-items-center gap-3">
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
            size="sm"
            onClick={onNuevoClick}
            className="d-flex align-items-center gap-1 shadow-sm"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Nuevo Elemento</span>
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => cambiarOrden('nombre')}>
                  Nombre {renderIconoOrden('nombre')}
                </th>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => cambiarOrden('frecuencia_recambio')}>
                  Frecuencia {renderIconoOrden('frecuencia_recambio')}
                </th>
                <th>Alerta Vencimiento</th>
                <th>Estado</th>
                <th className="text-center" style={{ width: '150px' }}>Acciones</th>
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
                    <tr key={e.id} className={!e.activo ? 'opacity-50' : ''}>
                      <td><strong>{e.nombre}</strong></td>
                      <td>{e.frecuencia_recambio ? `${e.frecuencia_recambio} días` : <span className="text-muted">No definida</span>}</td>
                      
                      {/* COLUMNA ALERTA (SEMÁFORO) */}
                      <td>
                        {alerta ? (
                          <div>
                            <Badge bg={alerta.variante} className={`mb-1 ${alerta.extraClass || ''}`}>
                              {alerta.texto}
                            </Badge>
                            <br/>
                            <small className="text-muted">Vence: {e.fecha_proximo_recambio}</small>
                          </div>
                        ) : (
                          <span className="text-muted small">Sin seguimiento</span>
                        )}
                      </td>

                      <td>
                        {e.activo ? <Badge bg="success">Activo</Badge> : <Badge bg="danger">Inactivo</Badge>}
                      </td>

                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          {e.activo ? (
                            <>
                              {/* NUEVO BOTÓN DE RECAMBIO */}
                              <Button
                                variant="info"
                                size="sm"
                                className="text-white py-1 px-2 shadow-sm"
                                title="Registrar Recambio Físico Hoy"
                                onClick={async () => {
                                  if (confirm(`¿Registrar que se cambió el elemento: ${e.nombre} en la fecha de hoy?`)) {
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
                              title="Reactivar elemento"
                              onClick={async () => {
                                if (confirm(`¿Reactivar el elemento ${e.nombre}?`)) {
                                  try {
                                    await guardar({ ...e, activo: true }, e.id);
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
                  );
                })
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
                <Pagination.Item key={num} active={num === page} onClick={() => changePage(num)}>{num}</Pagination.Item>
              ))}
              <Pagination.Next onClick={nextPage} disabled={page === totalPages} />
            </Pagination>
          </Card.Footer>
        )}
      </Card>
    </>
  );
}