import { useState } from 'react';
import { Container, Table, Card, Button, Badge, Form, Alert, Pagination } from 'react-bootstrap';
import { useUnidadMedida } from './useUnidadMedida';
import type { UnidadMedida } from './types';

type ModoVista = 'listado' | 'crear' | 'editar' | 'ver' | 'eliminar';

export const UnidadMedidaPage = () => {
  const { 
    unidades, loading, error, guardar, eliminar,
    page, totalPages, total, nextPage, prevPage, changePage,
    mostrarInactivos, setMostrarInactivos, ordenarPor, orden, cambiarOrden
  } = useUnidadMedida();

  const [modo, setModo] = useState<ModoVista>('listado');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadMedida | null>(null);

  const [tipo, setTipo] = useState('peso');
  const [sufijo, setSufijo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

  const renderIconoOrden = (columna: string) => {
    if (ordenarPor !== columna) return <i className="bi bi-chevron-expand text-muted ms-1" style={{ fontSize: '0.8rem' }}></i>;
    return orden === 'asc' ? <i className="bi bi-chevron-up ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i> : <i className="bi bi-chevron-down ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i>;
  };

  const handleNuevo = () => {
    setUnidadSeleccionada(null);
    setTipo('peso');
    setSufijo('');
    setModo('crear');
  };

  const handleEditar = (u: UnidadMedida) => {
    setUnidadSeleccionada(u);
    setTipo(u.tipo);
    setSufijo(u.sufijo);
    setModo('editar');
  };

  const handleVer = (u: UnidadMedida) => {
    setUnidadSeleccionada(u);
    setModo('ver');
  };

  const handleEliminarClick = (u: UnidadMedida) => {
    setUnidadSeleccionada(u);
    setErrorBackend(null);
    setModo('eliminar');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipo || !sufijo) return;

    setEnviando(true);
    try {
      if (modo === 'editar' && unidadSeleccionada) {
        await guardar({ tipo, sufijo }, unidadSeleccionada.id);
      } else {
        await guardar({ tipo, sufijo });
      }
      setModo('listado');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setEnviando(false);
    }
  };

  const handleConfirmarBaja = async () => {
    if (!unidadSeleccionada) return;
    setEnviando(true);
    setErrorBackend(null);
    try {
      await eliminar(unidadSeleccionada.id);
      setModo('listado');
    } catch (err: unknown) {
      setErrorBackend(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setEnviando(false);
    }
  };

  if (loading && page === 1) return <p className="p-4">Cargando unidades...</p>;
  if (error) return <p className="p-4 text-danger">{error}</p>;

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Tipos de Unidades de Medida</h2>

      {modo === 'ver' && unidadSeleccionada && (
        <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
          <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
            <i className="bi bi-rulers fs-5"></i>
            <h5 className="mb-0">Detalle de la Unidad de Medida</h5>
          </Card.Header>
          <Card.Body className="p-4">
            <div className="bg-light p-3 rounded border mb-2">
              <div className="row mb-2">
                <span className="col-4 text-muted fw-semibold">ID:</span>
                <span className="col-8"><Badge bg="secondary">#{unidadSeleccionada.id}</Badge></span>
              </div>
              <div className="row mb-2">
                <span className="col-4 text-muted fw-semibold">Tipo:</span>
                <span className="col-8 fw-bold text-capitalize">{unidadSeleccionada.tipo}</span>
              </div>
              <div className="row mb-2">
                <span className="col-4 text-muted fw-semibold">Sufijo:</span>
                <span className="col-8">{unidadSeleccionada.sufijo}</span>
              </div>
              <div className="row">
                <span className="col-4 text-muted fw-semibold">Estado:</span>
                <span className="col-8">
                  {unidadSeleccionada.activo ? <Badge bg="success">Activo</Badge> : <Badge bg="danger">Inactivo</Badge>}
                </span>
              </div>
            </div>
          </Card.Body>
          <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
            <Button variant="secondary" onClick={() => setModo('listado')}>Volver</Button>
            {unidadSeleccionada.activo && (
              <Button variant="warning" onClick={() => handleEditar(unidadSeleccionada)} className="text-white">Editar</Button>
            )}
          </Card.Footer>
        </Card>
      )}

      {(modo === 'crear' || modo === 'editar') && (
        <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
          <Card.Header as="h5" className="bg-light text-secondary py-3">
            {modo === 'editar' ? `Modificar Unidad: ${unidadSeleccionada?.sufijo}` : 'Registrar Nueva Unidad de Medida'}
          </Card.Header>
          <Card.Body className="p-4">
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Tipo</Form.Label>
                <Form.Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="peso">Peso</option>
                  <option value="longitud">Longitud</option>
                  <option value="capacidad">Capacidad</option>
                  <option value="unidad">Unidad</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Sufijo (Ej: Kg, Litros)</Form.Label>
                <Form.Control 
                  type="text" 
                  required 
                  value={sufijo} 
                  onChange={(e) => setSufijo(e.target.value)} 
                  placeholder="Ej: Kg"
                />
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setModo('listado')} disabled={enviando}>Cancelar</Button>
                <Button variant="primary" type="submit" disabled={enviando}>
                  {enviando ? 'Guardando...' : modo === 'editar' ? 'Actualizar Cambios' : 'Guardar'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {modo === 'eliminar' && unidadSeleccionada && (
        <Card className="border-danger shadow-sm mx-auto" style={{ maxWidth: '650px' }}>
          <Card.Header className="bg-danger text-white d-flex align-items-center gap-2 py-3">
            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
            <h5 className="mb-0">Eliminar Unidad de Medida</h5>
          </Card.Header>
          <Card.Body className="p-4">
            {errorBackend && (
              <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-x-circle-fill fs-5"></i>
                <div>{errorBackend}</div>
              </Alert>
            )}
            <p className="text-secondary fs-6">Esta acción aplicará una baja lógica; la unidad de medida dejará de estar visible pero no se borrará de la base de datos.</p>
            <div className="bg-light p-3 rounded border mb-4">
              <div className="row mb-2">
                <span className="col-4 text-muted fw-semibold">ID:</span>
                <span className="col-8"><Badge bg="secondary">#{unidadSeleccionada.id}</Badge></span>
              </div>
              <div className="row mb-2">
                <span className="col-4 text-muted fw-semibold">Tipo:</span>
                <span className="col-8 text-capitalize fw-bold">{unidadSeleccionada.tipo}</span>
              </div>
              <div className="row">
                <span className="col-4 text-muted fw-semibold">Sufijo:</span>
                <span className="col-8">{unidadSeleccionada.sufijo}</span>
              </div>
            </div>
          </Card.Body>
          <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
            <Button variant="secondary" onClick={() => setModo('listado')} disabled={enviando}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirmarBaja} disabled={enviando}>
              {enviando ? 'Eliminando...' : 'Confirmar Eliminación'}
            </Button>
          </Card.Footer>
        </Card>
      )}

      {modo === 'listado' && (
        <>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
            <h4 className="mb-0 text-secondary mt-md-2">Nómina de Unidades</h4>
            <div className="d-flex flex-wrap align-items-center gap-3">
              <Form.Check 
                type="switch" id="switch-inactivos" label="Ver dados de baja"
                checked={mostrarInactivos} onChange={(e) => setMostrarInactivos(e.target.checked)}
                className="text-secondary mb-0"
              />
              <Button 
                variant="success" 
                size="sm" 
                onClick={handleNuevo} 
                className="d-flex align-items-center gap-1 shadow-sm"
              >
                <i className="bi bi-plus-lg"></i>
                <span>Nueva Unidad</span>
              </Button>
            </div>
          </div>

          <Card className="shadow-sm border-0">
            <Card.Body className="p-0">
              <Table striped hover responsive className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ cursor: 'pointer' }} onClick={() => cambiarOrden('id')}>
                      ID {renderIconoOrden('id')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => cambiarOrden('tipo')}>
                      Tipo {renderIconoOrden('tipo')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => cambiarOrden('sufijo')}>
                      Sufijo {renderIconoOrden('sufijo')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => cambiarOrden('activo')}>
                      Estado {renderIconoOrden('activo')}
                    </th>
                    <th className="text-center" style={{ width: '120px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {unidades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        No hay unidades de medida registradas.
                      </td>
                    </tr>
                  ) : (
                    unidades.map((u) => (
                      <tr key={u.id} className={!u.activo ? 'opacity-50' : ''}>
                        <td><Badge bg="secondary">#{u.id}</Badge></td>
                        <td className="text-capitalize"><strong>{u.tipo}</strong></td>
                        <td>{u.sufijo}</td>
                        <td>{u.activo ? <Badge bg="success">Activo</Badge> : <Badge bg="danger">Inactivo</Badge>}</td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-2">
                            {u.activo ? (
                              <>
                                <Button variant="primary" size="sm" className="text-white py-1 px-2 shadow-sm" title="Ver Detalle" onClick={() => handleVer(u)}>
                                  <i className="bi bi-eye-fill"></i>
                                </Button>
                                <Button variant="warning" size="sm" className="text-white py-1 px-2 shadow-sm" title="Modificar" onClick={() => handleEditar(u)}>
                                  <i className="bi bi-pencil-fill"></i>
                                </Button>
                                <Button variant="danger" size="sm" className="py-1 px-2 shadow-sm" title="Eliminar" onClick={() => handleEliminarClick(u)}>
                                  <i className="bi bi-trash3-fill"></i>
                                </Button>
                              </>
                            ) : (
                              <Button variant="success" size="sm" className="py-1 px-2 shadow-sm" onClick={async () => {
                                  if (confirm(`¿Reactivar la unidad ${u.sufijo}?`)) {
                                    try { await guardar({ activo: true }, u.id); } 
                                    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Error al reactivar.'); }
                                  }
                                }}>
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
                <span className="text-muted small mb-2 mb-md-0">Mostrando página {page} de {totalPages} ({total} registros en total)</span>
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
      )}
    </Container>
  );
};