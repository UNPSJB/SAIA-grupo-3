import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge, Button, Card, Container, Form, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { FormErrors } from '../../shared/components/FormErrors';
import { ListControls } from '../../shared/components/ListControls';
import { ListPagination } from '../../shared/components/ListPagination';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { SortableHeader } from '../../shared/components/SortableHeader';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { usePagedList } from '../../shared/hooks/usePagedList';
import { bajaClaseFuncional, getClaseFuncional, guardarClaseFuncional } from './aditivosApi';
import { ConfirmarBaja } from './ConfirmarBaja';
import { MaestroAcciones } from './MaestroAcciones';
import type { ClaseFuncional, ClaseFuncionalDatos } from './types';

function ClaseFuncionalForm({
  clase,
  onGuardado,
  onCancelar,
}: {
  clase: ClaseFuncional | null;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const form = useForm<ClaseFuncionalDatos>({
    defaultValues: { nombre: '', ins_opcional: false, declarar_solo_funcion: false },
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const { reset } = form;

  useEffect(() => {
    reset({
      nombre: clase?.nombre ?? '',
      ins_opcional: clase?.ins_opcional ?? false,
      declarar_solo_funcion: clase?.declarar_solo_funcion ?? false,
    });
  }, [clase, reset]);

  const enviar = form.handleSubmit(async (datos) => {
    try {
      await guardarClaseFuncional({ ...datos, nombre: datos.nombre.trim() }, clase?.id);
      onGuardado();
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'No se pudo guardar.',
      });
    }
  });

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '560px' }}>
      <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
        {clase ? `Modificar clase: ${clase.nombre}` : 'Nueva clase funcional'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form noValidate onSubmit={enviar}>
          <FormErrors key={submitCount} errors={errors} />
          <Form.Group controlId="clase-nombre" className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              placeholder="Ej.: Conservante"
              isInvalid={!!errors.nombre}
              {...form.register('nombre', {
                validate: (valor) => !!valor.trim() || 'El nombre es obligatorio.',
              })}
            />
          </Form.Group>
          <Form.Group controlId="clase-ins-opcional" className="mb-4">
            <Form.Check
              type="switch"
              label="El número INS es opcional (por ejemplo, aromatizantes)"
              {...form.register('ins_opcional')}
            />
          </Form.Group>
          <Form.Group controlId="clase-solo-funcion" className="mb-4">
            <Form.Check
              type="switch"
              label="En el rótulo se declara solo por su función (por ejemplo, aromatizantes)"
              {...form.register('declarar_solo_funcion')}
            />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancelar} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}

export function ClasesFuncionalesPage() {
  const route = useCrudRoute<ClaseFuncional>('/clases-funcionales', getClaseFuncional);
  const list = usePagedList<ClaseFuncional>(
    'clases-funcionales',
    route.mode === 'listado',
    '',
    'nombre',
  );

  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const seleccionada = route.item;

  const reactivar = async (clase: ClaseFuncional) => {
    setErrorAccion(null);
    try {
      await guardarClaseFuncional({ activo: true }, clase.id);
      list.refetch();
    } catch (err: unknown) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo reactivar.');
    }
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Clases funcionales de aditivos</h2>
      {route.loading && <LoadingSpinner mensaje="Cargando..." />}
      {route.error && <ErrorAlert mensaje={route.error} />}
      {route.mode === 'listado' && (
        <>
          <ListControls {...list} title="Lista de referencia">
            <Form.Check
              id="clases-inactivas"
              type="switch"
              label="Ver dadas de baja"
              checked={list.mostrarInactivos}
              onChange={(e) => list.setMostrarInactivos(e.target.checked)}
            />
            <Button variant="success" onClick={() => route.open()}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Nueva clase funcional
            </Button>
          </ListControls>
          {list.error && <ErrorAlert mensaje={list.error} />}
          {errorAccion && <ErrorAlert mensaje={errorAccion} />}
          {list.loading && <LoadingSpinner mensaje="Cargando listado..." />}
          <Card className="shadow-sm border-0">
            <Card.Body className="p-0">
              <Table responsive striped hover className="mb-0 align-middle">
                <thead className="table-theme">
                  <tr>
                    <SortableHeader column="nombre" {...list}>
                      Nombre
                    </SortableHeader>
                    <SortableHeader column="ins_opcional" {...list}>
                      Número INS
                    </SortableHeader>
                    <th>Rótulo</th>
                    <SortableHeader column="activo" {...list}>
                      Estado
                    </SortableHeader>
                    <th className="text-center" style={{ width: '150px' }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((clase) => (
                    <tr key={clase.id}>
                      <td>{clase.nombre}</td>
                      <td>{clase.ins_opcional ? 'Opcional' : 'Obligatorio'}</td>
                      <td>{clase.declarar_solo_funcion ? 'Solo función' : 'Función y aditivo'}</td>
                      <td>
                        <Badge bg={clase.activo ? 'success' : 'danger'}>
                          {clase.activo ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <MaestroAcciones
                          activo={clase.activo}
                          onModificar={() => route.open(clase, 'editar')}
                          onBaja={() => route.open(clase, 'eliminar')}
                          onReactivar={() => void reactivar(clase)}
                        />
                      </td>
                    </tr>
                  ))}
                  {!list.loading && list.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        No hay resultados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
            {list.totalPages > 0 && (
              <Card.Footer className="bg-body border-top">
                <ListPagination {...list} />
              </Card.Footer>
            )}
          </Card>
        </>
      )}
      {route.mode === 'crear' && (
        <ClaseFuncionalForm clase={null} onGuardado={route.back} onCancelar={route.back} />
      )}
      {(route.mode === 'editar' || route.mode === 'ver') && route.item && (
        <ClaseFuncionalForm clase={route.item} onGuardado={route.back} onCancelar={route.back} />
      )}
      {route.mode === 'eliminar' && seleccionada && (
        <ConfirmarBaja
          titulo={`Dar de baja: ${seleccionada.nombre}`}
          descripcion="La clase deja de estar disponible para nuevos aditivos de referencia. Las recetas ya guardadas no cambian."
          onConfirmar={async () => {
            await bajaClaseFuncional(seleccionada.id);
            route.back();
          }}
          onCancelar={route.back}
        />
      )}
    </Container>
  );
}
