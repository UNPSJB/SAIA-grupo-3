import { SortableHeader } from '../../shared/components/SortableHeader';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { Navigate } from 'react-router-dom';
import { useForm, useController } from 'react-hook-form';
import { FormErrors } from '../../shared/components/FormErrors';
import { ListControls } from '../../shared/components/ListControls';
import { usePagedList } from '../../shared/hooks/usePagedList';
import { permissions } from '../../shared/libreria/permissions';
import { useState, useEffect } from 'react';
import { Badge, Button, Card, Container, Form, Pagination, Table } from 'react-bootstrap';

import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { API_BASE_URL } from '../../shared/libreria/api';
import { useAuth } from '../../shared/hooks/useAuth';
import {
  getIncidenteById,
  eliminarIncidente,
  guardarIncidente,
  type Incidente,
} from './incidentesApi';

export function IncidentesPage() {
  const route = useCrudRoute('/incidentes', getIncidenteById);
  const list = usePagedList<Incidente>(
    'incidentes',
    route.mode === 'listado',
    '',
    'fecha_hora',
    'desc',
  );
  const { items: incidentes, page, total, totalPages, loading, error, setPage } = list;
  const { currentUser } = useAuth();
  const { canAdmin } = permissions(currentUser);
  const form = useForm<{ descripcion: string }>({ defaultValues: { descripcion: '' } });
  const {
    field: {
      value: descripcion,
      onChange: setDescripcion,
      ref: descripcionRef,
      onBlur: descripcionBlur,
    },
  } = useController({
    name: 'descripcion',
    control: form.control,
    rules: {
      validate: (value) => !!value.trim() || 'Ingresá una descripción.',
      maxLength: { value: 1000, message: 'Máximo 1000 caracteres.' },
    },
  });
  const enviando = form.formState.isSubmitting;
  const operadores = currentUser?.operar ? [currentUser] : [];
  const [formError, setFormError] = useState<string | null>(null);
  const modoEdicion = route.mode === 'crear' || route.mode === 'editar';
  const incidenteSeleccionado = route.item;
  const reportanteDni =
    incidenteSeleccionado?.reportado_por_dni.toString() || currentUser?.dni || '';
  const { reset } = form;
  useEffect(() => {
    reset({ descripcion: route.item?.descripcion || '' });
  }, [route.item, reset]);
  const [foto, setFoto] = useState<File | null>(null);

  const cargarIncidentes = list.refetch;

  const iniciarCreacion = () => route.open();
  const iniciarEdicion = (item: Incidente) => route.open(item, 'editar');
  const cancelarEdicion = route.back;

  const handleGuardar = form.handleSubmit(async () => {
    setFormError(null);
    try {
      await guardarIncidente(
        {
          descripcion: descripcion.trim(),
          reportadoPorDni: incidenteSeleccionado ? undefined : reportanteDni,
          foto,
        },
        incidenteSeleccionado?.id,
      );
      route.back();
      await cargarIncidentes();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar el incidente.');
    }
  });

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
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Error al eliminar el incidente.',
      });
    }
  };

  if (route.mode === 'editar' && !canAdmin) return <Navigate to="/incidentes" replace />;

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Registro de incidentes</h2>

      {route.loading && <LoadingSpinner mensaje="Cargando incidente..." />}
      {route.error && (
        <>
          <ErrorAlert mensaje={route.error} />
          <Button onClick={route.back}>Volver</Button>
        </>
      )}
      {route.mode === 'ver' && incidenteSeleccionado && (
        <Card body>
          <h5>Detalle del incidente</h5>
          <p>{incidenteSeleccionado.descripcion}</p>
          <p>{new Date(incidenteSeleccionado.fecha_hora).toLocaleString()}</p>
          <Button onClick={route.back}>Volver</Button>{' '}
          {canAdmin && (
            <Button variant="warning" onClick={() => iniciarEdicion(incidenteSeleccionado)}>
              Editar
            </Button>
          )}
        </Card>
      )}
      {!modoEdicion && error && <ErrorAlert mensaje={error} />}

      {modoEdicion && !route.loading && !route.error ? (
        <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '700px' }}>
          <Card.Header as="h5" className="bg-light text-secondary py-3">
            {incidenteSeleccionado ? 'Modificar incidente' : 'Registrar incidente'}
          </Card.Header>
          <Card.Body className="p-4">
            {formError && <ErrorAlert mensaje={formError} />}
            {!incidenteSeleccionado && (
              <p className="small text-muted">El incidente se registra a nombre de tu usuario.</p>
            )}
            <Form noValidate onSubmit={handleGuardar}>
              {loading && <LoadingSpinner mensaje="Cargando incidentes..." />}
              <FormErrors errors={form.formState.errors} />
              {!incidenteSeleccionado && (
                <Form.Group className="mb-3">
                  <Form.Label>Reportado por</Form.Label>
                  <Form.Select required disabled value={reportanteDni}>
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
                  ref={descripcionRef}
                  onBlur={descripcionBlur}
                  isInvalid={!!form.formState.errors.descripcion}
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
      ) : route.mode === 'listado' ? (
        <>
          {loading && <LoadingSpinner mensaje="Cargando incidentes..." />}
          <FormErrors errors={form.formState.errors} />
          <ListControls {...list}>
            <Button variant="success" onClick={iniciarCreacion}>
              <i className="bi bi-plus-lg me-1"></i>Registrar incidente
            </Button>
          </ListControls>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-0">
              <Table striped hover responsive className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <SortableHeader column="fecha_hora" {...list}>
                      Fecha y hora
                    </SortableHeader>
                    <SortableHeader column="descripcion" {...list}>
                      Descripción
                    </SortableHeader>
                    <SortableHeader column="reportado_por_dni" {...list}>
                      Reportado por
                    </SortableHeader>
                    <th>Foto</th>
                    <th className="text-center" style={{ width: '120px' }}>
                      Acciones
                    </th>
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
                        <td className="text-break">
                          <Button variant="link" onClick={() => route.open(incidente)}>
                            {incidente.descripcion}
                          </Button>
                        </td>
                        <td>
                          <span>
                            {incidente.reportado_por.apellido}, {incidente.reportado_por.nombre}
                          </span>
                          <div>
                            <small className="text-muted">DNI: {incidente.reportado_por_dni}</small>
                          </div>
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
                          {canAdmin && (
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
      ) : null}
    </Container>
  );
}
