import { useState } from 'react';
import { Container, Table, Card, Button, Badge, Form, Alert } from 'react-bootstrap';
import { useUnidadMedida } from './useUnidadMedida';
import type { UnidadMedida } from './types';

type ModoVista = 'listado' | 'crear' | 'editar' | 'ver' | 'eliminar';

export const UnidadMedidaPage = () => {
  const { unidades, loading, error, guardar, eliminar } = useUnidadMedida();
  const [modo, setModo] = useState<ModoVista>('listado');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadMedida | null>(null);

  const [tipo, setTipo] = useState('peso');
  const [sufijo, setSufijo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

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

  if (loading && unidades.length === 0) return <p className="p-4">Cargando unidades...</p>;
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
              <div className="row">
                <span className="col-4 text-muted fw-semibold">Sufijo:</span>
                <span className="col-8">{unidadSeleccionada.sufijo}</span>
              </div>
            </div>
          </Card.Body>
          <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
            <Button variant="secondary" onClick={() => setModo('listado')}>Volver</Button>
            <Button variant="warning" onClick={() => handleEditar(unidadSeleccionada)} className="text-white">Editar</Button>
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
                <Button variant={modo === 'editar' ? 'warning' : 'success'} type="submit" disabled={enviando} className={modo === 'editar' ? 'text-white' : ''}>
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
            <p className="text-secondary fs-6">¿Estás seguro de que deseas eliminar esta unidad de medida?</p>
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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0 text-secondary">Nómina de Unidades</h4>
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

          <Card className="shadow-sm border-0">
            <Card.Body className="p-0">
              <Table striped hover responsive className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Sufijo</th>
                    <th className="text-center" style={{ width: '120px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {unidades.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        No hay unidades de medida registradas.
                      </td>
                    </tr>
                  ) : (
                    unidades.map((u) => (
                      <tr key={u.id}>
                        <td><Badge bg="secondary">#{u.id}</Badge></td>
                        <td className="text-capitalize"><strong>{u.tipo}</strong></td>
                        <td>{u.sufijo}</td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-2">
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="text-white py-1 px-2 shadow-sm" 
                              title="Ver Detalle" 
                              onClick={() => handleVer(u)}
                            >
                              <i className="bi bi-eye-fill"></i>
                            </Button>
                            <Button 
                              variant="warning" 
                              size="sm" 
                              className="text-white py-1 px-2 shadow-sm" 
                              title="Modificar" 
                              onClick={() => handleEditar(u)}
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </Button>
                            <Button 
                              variant="danger" 
                              size="sm" 
                              className="py-1 px-2 shadow-sm" 
                              title="Eliminar" 
                              onClick={() => handleEliminarClick(u)}
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
          </Card>
        </>
      )}
    </Container>
  );
};