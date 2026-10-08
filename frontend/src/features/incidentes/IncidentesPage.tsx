import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Container, Form, Pagination, Table } from 'react-bootstrap';

import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { API_BASE_URL } from '../../shared/libreria/api';
import { getPersonal, type Personal, type TipoCapacidad } from '../personal';
import {
  eliminarIncidente,
  getIncidentes,
  guardarIncidente,
  type Incidente,
} from './incidentesApi';

const CAPACIDADES_OPERAR: TipoCapacidad[] = ['operar', 'operar_administrar'];

export function IncidentesPage() {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [operadores, setOperadores] = useState<Personal[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<Incidente | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [reportanteDni, setReportanteDni] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargarIncidentes = useCallback(async () => {
    try {
      const respuesta = await getIncidentes(page, 10);
      setIncidentes(respuesta.items);
      setTotal(respuesta.total);
      setTotalPages(respuesta.pages);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar incidentes.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    let vigente = true;
    getIncidentes(page, 10)
      .then((respuesta) => {
        if (!vigente) return;
        setIncidentes(respuesta.items);
        setTotal(respuesta.total);
        setTotalPages(respuesta.pages);
        setError(null);
      })
      .catch((err: unknown) => {
        if (vigente) {
          setError(err instanceof Error ? err.message : 'Error al cargar incidentes.');
        }
      })
      .finally(() => {
        if (vigente) setLoading(false);
      });
    return () => {
      vigente = false;
    };
  }, [page]);

  useEffect(() => {
    getPersonal(1, 100)
      .then((respuesta) =>
        setOperadores(
          respuesta.items.filter(
            (persona) =>
              persona.activo !== false && CAPACIDADES_OPERAR.includes(persona.tipo_capacidad)
          )
        )
      )
      .catch((err: unknown) =>
        setFormError(err instanceof Error ? err.message : 'Error al cargar el personal.')
      );
  }, []);

  const iniciarCreacion = () => {
    setIncidenteSeleccionado(null);
    setDescripcion('');
    setReportanteDni('');
    setFoto(null);
    setFormError(null);
    setModoEdicion(true);
  };

  const iniciarEdicion = (incidente: Incidente) => {
    setIncidenteSeleccionado(incidente);
    setDescripcion(incidente.descripcion);
    setReportanteDni(incidente.reportado_por_dni.toString());
    setFoto(null);
    setFormError(null);
    setModoEdicion(true);
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
    setIncidenteSeleccionado(null);
    setFormError(null);
  };

  const handleGuardar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setEnviando(true);
    setFormError(null);
    try {
      await guardarIncidente(
        {
          descripcion: descripcion.trim(),
          reportadoPorDni: incidenteSeleccionado ? undefined : Number(reportanteDni),
          foto,
        },
        incidenteSeleccionado?.id
      );
      setModoEdicion(false);
      setIncidenteSeleccionado(null);
      await cargarIncidentes();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar el incidente.');
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminar = async (incidente: Incidente) => {
    if (!window.confirm('¿Eliminar este incidente? Esta acción no se puede deshacer.')) return;
    try {
      await eliminarIncidente(incidente.id);
      if (incidentes.length === 1 && page > 1) {
        setPage((pagina) => pagina - 1);
      } else {
        await cargarIncidentes();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el incidente.');
    }
  };

  if (loading && page === 1 && !modoEdicion && incidentes.length === 0) {
    return <LoadingSpinner mensaje="Cargando incidentes..." />;
  }

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Registro de incidentes</h2>

      {!modoEdicion && error && <ErrorAlert mensaje={error} />}

      {modoEdicion ? (
        <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '700px' }}>
          <Card.Header as="h5" className="bg-light text-secondary py-3">
            {incidenteSeleccionado ? 'Modificar incidente' : 'Registrar incidente'}
          </Card.Header>
          <Card.Body className="p-4">
            {formError && <ErrorAlert mensaje={formError} />}
            {!incidenteSeleccionado && (
              <p className="small text-muted">
                Hasta integrar el login, seleccioná a la persona que reporta el incidente.
              </p>
            )}
            <Form onSubmit={handleGuardar}>
              {!incidenteSeleccionado && (
                <Form.Group className="mb-3">
                  <Form.Label>Reportado por</Form.Label>
                  <Form.Select
                    required
                    value={reportanteDni}
                    onChange={(evento) => setReportanteDni(evento.target.value)}
                  >
                    <option value="">Seleccione un operador...</option>
                    {operadores.map((persona) => (
                      <option key={persona.dni} value={persona.dni}>
                        {persona.apellido}, {persona.nombre} (DNI: {persona.dni})
                      </option>
                    ))}
                  </Form.Select>
                  {operadores.length === 0 && (
                    <Form.Text className="text-danger">
                      No hay personal activo con permiso para operar.
                    </Form.Text>
                  )}
                </Form.Group>
              )}
              {incidenteSeleccionado && (
                <Form.Group className="mb-3">
                  <Form.Label>Reportado por</Form.Label>
                  <Form.Control
                    readOnly
                    value={`${incidenteSeleccionado.reportado_por.apellido}, ${incidenteSeleccionado.reportado_por.nombre}`}
                  />
                </Form.Group>
              )}
              <Form.Group className="mb-3">
                <Form.Label>Descripción</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  required
                  maxLength={1000}
                  value={descripcion}
                  onChange={(evento) => setDescripcion(evento.target.value)}
                  placeholder="Describa brevemente el incidente..."
                />
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label>Foto (opcional)</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={(evento) =>
                    setFoto((evento.target as HTMLInputElement).files?.[0] ?? null)
                  }
                />
                {incidenteSeleccionado?.imagen_path && (
                  <div className="mt-2">
                    <a
                      href={`${API_BASE_URL}${incidenteSeleccionado.imagen_path}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver foto actual
                    </a>
                  </div>
                )}
              </Form.Group>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={cancelarEdicion} disabled={enviando}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={enviando || (!incidenteSeleccionado && operadores.length === 0)}
                >
                  {enviando ? 'Guardando...' : incidenteSeleccionado ? 'Actualizar' : 'Registrar'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      ) : (
        <>
          <div className="d-flex justify-content-end mb-3">
            <Button variant="success" onClick={iniciarCreacion}>
              <i className="bi bi-plus-lg me-1"></i>Registrar incidente
            </Button>
          </div>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-0">
              <Table striped hover responsive className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Descripción</th>
                    <th>Reportado por</th>
                    <th>Foto</th>
                    <th className="text-center" style={{ width: '120px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {incidentes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        No hay incidentes registrados.
                      </td>
                    </tr>
                  ) : (
                    incidentes.map((incidente) => (
                      <tr key={incidente.id}>
                        <td>{new Date(incidente.fecha_hora).toLocaleString()}</td>
                        <td className="text-break">{incidente.descripcion}</td>
                        <td>
                          <span>{incidente.reportado_por.apellido}, {incidente.reportado_por.nombre}</span>
                          <div><small className="text-muted">DNI: {incidente.reportado_por_dni}</small></div>
                        </td>
                        <td>
                          {incidente.imagen_path ? (
                            <a
                              href={`${API_BASE_URL}${incidente.imagen_path}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ver foto
                            </a>
                          ) : (
                            <Badge bg="secondary">Sin foto</Badge>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-2">
                            <Button
                              variant="warning"
                              size="sm"
                              title="Modificar"
                              onClick={() => iniciarEdicion(incidente)}
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              title="Eliminar"
                              onClick={() => void handleEliminar(incidente)}
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
                <span className="text-muted small mb-2 mb-md-0">
                  Página {page} de {totalPages} ({total} incidentes)
                </span>
                <Pagination className="mb-0" size="sm">
                  <Pagination.Prev
                    onClick={() => setPage((pagina) => Math.max(1, pagina - 1))}
                    disabled={page === 1}
                  />
                  <Pagination.Next
                    onClick={() => setPage((pagina) => Math.min(totalPages, pagina + 1))}
                    disabled={page === totalPages}
                  />
                </Pagination>
              </Card.Footer>
            )}
          </Card>
        </>
      )}
    </Container>
  );
}
