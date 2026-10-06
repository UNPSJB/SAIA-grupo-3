import { useState } from 'react';
import { Badge, Button, Card, Container, Form, Pagination, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useTipoDocumento } from './useTipoDocumento';
import type { TipoDocumento, TipoDocumentoDatos } from './types';

type ModoVista = 'listado' | 'crear' | 'editar';

export function TipoDocumentoPage() {
  const {
    tiposDocumento, loading, error, guardar, eliminar,
    page, totalPages, total, nextPage, prevPage, changePage,
    mostrarInactivos, setMostrarInactivos, ordenarPor, orden, cambiarOrden,
  } = useTipoDocumento();
  const [modo, setModo] = useState<ModoVista>('listado');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoDocumento | null>(null);
  const [nombre, setNombre] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);

  const iniciarCreacion = () => {
    setTipoSeleccionado(null);
    setNombre('');
    setErrorFormulario(null);
    setModo('crear');
  };

  const iniciarEdicion = (tipo: TipoDocumento) => {
    setTipoSeleccionado(tipo);
    setNombre(tipo.nombre);
    setErrorFormulario(null);
    setModo('editar');
  };

  const handleGuardar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setEnviando(true);
    setErrorFormulario(null);
    const datos: TipoDocumentoDatos = { nombre: nombre.trim() };
    try {
      await guardar(datos, modo === 'editar' ? tipoSeleccionado?.id : undefined);
      setModo('listado');
    } catch (err: unknown) {
      setErrorFormulario(err instanceof Error ? err.message : 'Error al guardar el tipo.');
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminar = async (tipo: TipoDocumento) => {
    if (!window.confirm(`¿Dar de baja el tipo de documento "${tipo.nombre}"?`)) return;
    try {
      await eliminar(tipo.id);
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'Error al dar de baja el tipo.');
    }
  };

  const handleReactivar = async (tipo: TipoDocumento) => {
    if (!window.confirm(`¿Reactivar el tipo de documento "${tipo.nombre}"?`)) return;
    try {
      await guardar({ activo: true }, tipo.id);
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'Error al reactivar el tipo.');
    }
  };

  const renderIconoOrden = (columna: string) => {
    if (ordenarPor !== columna) {
      return <i className="bi bi-chevron-expand text-muted ms-1" style={{ fontSize: '0.8rem' }}></i>;
    }
    return orden === 'asc'
      ? <i className="bi bi-chevron-up ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i>
      : <i className="bi bi-chevron-down ms-1 text-primary" style={{ fontSize: '0.8rem' }}></i>;
  };

  if (loading && page === 1 && modo === 'listado') {
    return <LoadingSpinner mensaje="Cargando tipos de documento..." />;
  }

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Tipos de documentos</h2>

      {error && modo === 'listado' && <ErrorAlert mensaje={error} />}

      {modo !== 'listado' && (
        <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
          <Card.Header as="h5" className="bg-light text-secondary py-3">
            {modo === 'editar' ? 'Modificar tipo de documento' : 'Registrar tipo de documento'}
          </Card.Header>
          <Card.Body className="p-4">
            {errorFormulario && <ErrorAlert mensaje={errorFormulario} />}
            <Form onSubmit={handleGuardar}>
              <Form.Group className="mb-4">
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  type="text"
                  required
                  maxLength={100}
                  value={nombre}
                  onChange={(evento) => setNombre(evento.target.value)}
                  placeholder="Ej.: Carnet de manipulador"
                />
              </Form.Group>
              <div className="d-flex justify-content-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setModo('listado')}
                  disabled={enviando}
                >
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" disabled={enviando}>
                  {enviando ? 'Guardando...' : modo === 'editar' ? 'Actualizar cambios' : 'Guardar'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {modo === 'listado' && (
        <>
          <div className="d-flex flex-column align-items-center mb-4 gap-3">
            <div className="d-flex flex-column gap-2 w-100">
              {/*
              <Form.Control
                type="search"
                size="sm"
                aria-label="Buscar tipo de documento"
                placeholder="Buscar tipo..."
                value={busqueda}
                onChange={(evento) => {
                  setBusqueda(evento.target.value);
                  changePage(1);
                }}
                className="mx-auto text-center"
                style={{ maxWidth: '220px' }}
              />
              */}
              <h4 className="mb-0 text-secondary">Catálogo de tipos</h4>
            </div>
            <div className="d-flex flex-wrap justify-content-end align-items-center gap-3 w-100">
              <Form.Check
                type="switch"
                id="switch-tipos-documento-inactivos"
                label="Ver dados de baja"
                checked={mostrarInactivos}
                onChange={(evento) => setMostrarInactivos(evento.target.checked)}
                className="text-secondary mb-0"
              />
              <Button
                variant="success"
                size="sm"
                onClick={iniciarCreacion}
                className="d-flex align-items-center gap-1 shadow-sm"
              >
                <i className="bi bi-plus-lg"></i><span>Nuevo tipo</span>
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
                    <th style={{ cursor: 'pointer' }} onClick={() => cambiarOrden('nombre')}>
                      Nombre {renderIconoOrden('nombre')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => cambiarOrden('activo')}>
                      Estado {renderIconoOrden('activo')}
                    </th>
                    <th className="text-center" style={{ width: '120px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tiposDocumento.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-4 text-muted">No hay tipos de documento registrados.</td></tr>
                  ) : (
                    tiposDocumento.map((tipo) => (
                      <tr key={tipo.id} className={!tipo.activo ? 'opacity-50' : ''}>
                        <td><Badge bg="secondary">#{tipo.id}</Badge></td>
                        <td><strong>{tipo.nombre}</strong></td>
                        <td>{tipo.activo ? <Badge bg="success">Activo</Badge> : <Badge bg="danger">Inactivo</Badge>}</td>
                        <td className="text-center">
                          {tipo.activo ? (
                            <div className="d-flex justify-content-center gap-2">
                              <Button variant="warning" size="sm" title="Modificar" onClick={() => iniciarEdicion(tipo)}>
                                <i className="bi bi-pencil-fill"></i>
                              </Button>
                              <Button variant="danger" size="sm" title="Dar de baja" onClick={() => void handleEliminar(tipo)}>
                                <i className="bi bi-trash3-fill"></i>
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => void handleReactivar(tipo)}
                            >
                              <i className="bi bi-arrow-counterclockwise me-1"></i>Reactivar
                            </Button>
                          )}
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
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((numero) => (
                    <Pagination.Item key={numero} active={numero === page} onClick={() => changePage(numero)}>
                      {numero}
                    </Pagination.Item>
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
}
