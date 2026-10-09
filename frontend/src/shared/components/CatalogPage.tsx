import { SortableHeader } from './SortableHeader';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Container, Form, Table, Badge } from 'react-bootstrap';
import { useCrudRoute } from '../hooks/useCrudRoute';
import { usePagedList } from '../hooks/usePagedList';
import { API_BASE_URL, fetchWithAuth, mensajeDeError } from '../libreria/api';
import { ListControls } from './ListControls';
import { FormErrors } from './FormErrors';
import { ErrorAlert } from './ErrorAlert';
import { LoadingSpinner } from './LoadingSpinner';
import { ListPagination } from './ListPagination';
type RecordItem = { id: number; activo: boolean; nombre?: string; tipo?: string; sufijo?: string };
interface Props {
  title: string;
  endpoint: string;
  fields: Record<string, string>;
  options?: Record<string, string[]>;
  load: (id: number) => Promise<RecordItem>;
}
export function CatalogPage({ title, endpoint, fields, options, load }: Props) {
  const route = useCrudRoute(`/${endpoint}`, load);
  const list = usePagedList<RecordItem>(endpoint, route.mode === 'listado');
  const form = useForm<Record<string, string>>({ shouldUnregister: true });
  const { reset } = form;
  useEffect(() => {
    reset(
      Object.fromEntries(
        Object.keys(fields).map((key) => [
          key,
          String(route.item?.[key as keyof RecordItem] ?? options?.[key]?.[0] ?? ''),
        ]),
      ),
    );
  }, [route.item, fields, options, reset]);
  const mutate = async (method: string, id?: number, data?: object) => {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/${endpoint}${id === undefined ? '' : `/${id}`}`,
      { method, body: data ? JSON.stringify(data) : undefined },
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(mensajeDeError(error.detail, 'No se pudo guardar.'));
    }
  };
  const save = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    try {
      await mutate(
        route.mode === 'editar' ? 'PUT' : 'POST',
        route.mode === 'editar' ? route.item?.id : undefined,
        Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])),
      );
      route.back();
    } catch (err) {
      form.setError('root', { message: err instanceof Error ? err.message : 'Error al guardar.' });
    }
  });
  const remove = async () => {
    if (!route.item) return;
    try {
      await mutate('DELETE', route.item.id);
      route.back();
    } catch (err) {
      form.setError('root', { message: err instanceof Error ? err.message : 'Error al eliminar.' });
    }
  };
  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">{title}</h2>
      {route.loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {route.error && (
        <>
          <ErrorAlert mensaje={route.error} />
          <Button onClick={route.back}>Volver</Button>
        </>
      )}
      {route.mode === 'listado' && (
        <>
          <ListControls
            {...list}
            title={endpoint === 'tipos-documento' ? 'Catálogo de tipos' : 'Nómina de Unidades'}
          >
            <Form.Check
              id={`inactivos-${endpoint}`}
              type="switch"
              label="Ver dados de baja"
              checked={list.mostrarInactivos}
              onChange={(e) => list.setMostrarInactivos(e.target.checked)}
            />
            <Button variant="success" onClick={() => route.open()}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              {endpoint === 'tipos-documento'
                ? 'Nuevo Tipo de Documento'
                : 'Nueva Unidad de Medida'}
            </Button>
          </ListControls>
          {list.error && <ErrorAlert mensaje={list.error} />}
          {list.loading && <LoadingSpinner mensaje="Cargando listado..." />}
          <FormErrors errors={form.formState.errors} />
          <Card className="shadow-sm border-0">
            <Card.Body className="p-0">
              <Table responsive striped hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <SortableHeader column="id" {...list}>
                      ID
                    </SortableHeader>
                    {Object.entries(fields).map(([key, label]) => (
                      <SortableHeader key={key} column={key} {...list}>
                        {label}
                      </SortableHeader>
                    ))}
                    <SortableHeader column="activo" {...list}>
                      Estado
                    </SortableHeader>
                    <th className="text-center" style={{ width: '150px' }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Badge bg="secondary">#{item.id}</Badge>
                      </td>
                      {Object.keys(fields).map((key) => (
                        <td key={key}>{String(item[key as keyof RecordItem] ?? '')}</td>
                      ))}
                      <td>
                        <Badge bg={item.activo ? 'success' : 'danger'}>
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          {item.activo ? (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                className="text-white py-1 px-2 shadow-sm"
                                title="Ver"
                                aria-label="Ver"
                                onClick={() => route.open(item)}
                              >
                                <i className="bi bi-eye-fill" aria-hidden="true" />
                              </Button>
                              <Button
                                size="sm"
                                variant="warning"
                                className="text-white py-1 px-2 shadow-sm"
                                title="Modificar"
                                aria-label="Modificar"
                                onClick={() => route.open(item, 'editar')}
                              >
                                <i className="bi bi-pencil-fill" aria-hidden="true" />
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                className="py-1 px-2 shadow-sm"
                                title="Dar de baja"
                                aria-label="Dar de baja"
                                onClick={() => route.open(item, 'eliminar')}
                              >
                                <i className="bi bi-trash3-fill" aria-hidden="true" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={async () => {
                                if (!confirm('¿Reactivar el registro?')) return;
                                try {
                                  await mutate('PUT', item.id, { activo: true });
                                  list.refetch();
                                } catch (err) {
                                  form.setError('root', {
                                    message:
                                      err instanceof Error ? err.message : 'Error al reactivar.',
                                  });
                                }
                              }}
                            >
                              <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />{' '}
                              Reactivar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!list.loading && list.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={Object.keys(fields).length + 3}
                        className="text-center py-4 text-muted"
                      >
                        No hay resultados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
            {list.totalPages > 0 && (
              <Card.Footer className="bg-white border-top">
                <ListPagination {...list} />
              </Card.Footer>
            )}
          </Card>
        </>
      )}
      {(route.mode === 'crear' || (route.mode === 'editar' && route.item)) && (
        <Card body>
          <Form noValidate onSubmit={save}>
            <FormErrors errors={form.formState.errors} />
            {Object.entries(fields).map(([key, label]) => (
              <Form.Group key={key} controlId={`catalog-${key}`} className="mb-3">
                <Form.Label>{label}</Form.Label>
                {options?.[key] ? (
                  <Form.Select
                    {...form.register(key, { required: 'Este campo es obligatorio.' })}
                    isInvalid={!!form.formState.errors[key]}
                  >
                    {options[key].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  <Form.Control
                    {...form.register(key, {
                      validate: (value) => !!value?.trim() || 'Este campo es obligatorio.',
                    })}
                    isInvalid={!!form.formState.errors[key]}
                  />
                )}
                <Form.Control.Feedback type="invalid">
                  {String(form.formState.errors[key]?.message ?? '')}
                </Form.Control.Feedback>
              </Form.Group>
            ))}
            <Button variant="secondary" onClick={route.back} disabled={form.formState.isSubmitting}>
              Cancelar
            </Button>{' '}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </Form>
        </Card>
      )}
      {route.mode === 'ver' && route.item && (
        <Card body>
          {Object.entries(fields).map(([key, label]) => (
            <p key={key}>
              <strong>{label}:</strong>{' '}
              {String(route.item?.[key as keyof RecordItem] ?? options?.[key]?.[0] ?? '')}
            </p>
          ))}
          <Button onClick={route.back}>Volver</Button>{' '}
          <Button variant="warning" onClick={() => route.open(route.item!, 'editar')}>
            Editar
          </Button>
        </Card>
      )}
      {route.mode === 'eliminar' && route.item && (
        <Card body>
          <p>¿Dar de baja este registro?</p>
          <FormErrors errors={form.formState.errors} />
          <Form onSubmit={form.handleSubmit(remove)}>
            <Button onClick={route.back} disabled={form.formState.isSubmitting}>
              Cancelar
            </Button>{' '}
            <Button type="submit" variant="danger" disabled={form.formState.isSubmitting}>
              Confirmar baja
            </Button>
          </Form>
        </Card>
      )}
    </Container>
  );
}
