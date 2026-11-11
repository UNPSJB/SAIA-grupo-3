import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Badge, Button, Card, Container, Form, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { FormErrors } from '../../shared/components/FormErrors';
import { ListControls } from '../../shared/components/ListControls';
import { ListPagination } from '../../shared/components/ListPagination';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { SortableHeader } from '../../shared/components/SortableHeader';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { usePagedList } from '../../shared/hooks/usePagedList';
import { bajaAditivo, getAditivo, getClasesActivas, guardarAditivo } from './aditivosApi';
import { ConfirmarBaja } from './ConfirmarBaja';
import { MaestroAcciones } from './MaestroAcciones';
import type { AditivoReferencia } from './types';

interface ValoresAditivo {
  clase_funcional_id: string;
  nombre: string;
  ins: string;
}

const PATRON_INS = /^\d{3,4}[a-z]?(\([ivx]+\))?$/i;

function AditivoForm({
  aditivo,
  onGuardado,
  onCancelar,
}: {
  aditivo: AditivoReferencia | null;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const clases = useConsulta(getClasesActivas, []);
  const form = useForm<ValoresAditivo>({
    defaultValues: { clase_funcional_id: '', nombre: '', ins: '' },
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const { reset } = form;
  const claseId = useWatch({ control: form.control, name: 'clase_funcional_id' });
  const clase = clases.datos?.find((opcion) => String(opcion.id) === claseId);

  useEffect(() => {
    reset({
      clase_funcional_id: aditivo ? String(aditivo.clase_funcional_id) : '',
      nombre: aditivo?.nombre ?? '',
      ins: aditivo?.ins ?? '',
    });
  }, [aditivo, reset]);

  const enviar = form.handleSubmit(async (valores) => {
    try {
      await guardarAditivo(
        {
          clase_funcional_id: Number(valores.clase_funcional_id),
          nombre: valores.nombre.trim(),
          ins: valores.ins.replace(/\s+/g, '') || null,
        },
        aditivo?.id,
      );
      onGuardado();
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'No se pudo guardar.',
      });
    }
  });

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '620px' }}>
      <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
        {aditivo ? `Modificar aditivo: ${aditivo.nombre}` : 'Nuevo aditivo de referencia'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form noValidate onSubmit={enviar}>
          <FormErrors key={submitCount} errors={errors} />
          {clases.error && <ErrorAlert mensaje={clases.error} />}
          <Form.Group controlId="aditivo-clase" className="mb-3">
            <Form.Label>Clase funcional</Form.Label>
            <SearchableSelect
              isInvalid={!!errors.clase_funcional_id}
              disabled={clases.cargando}
              {...form.register('clase_funcional_id', { required: 'Elegí la clase funcional.' })}
            >
              <option value="">Seleccioná una clase...</option>
              {clases.datos?.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.nombre}
                </option>
              ))}
            </SearchableSelect>
          </Form.Group>
          <Form.Group controlId="aditivo-nombre" className="mb-3">
            <Form.Label>Nombre completo</Form.Label>
            <Form.Control
              placeholder="Ej.: Sorbato de potasio"
              isInvalid={!!errors.nombre}
              {...form.register('nombre', {
                validate: (valor) => !!valor.trim() || 'El nombre completo es obligatorio.',
              })}
            />
          </Form.Group>
          <Form.Group controlId="aditivo-ins" className="mb-4">
            <Form.Label>
              Número INS{clase?.ins_opcional ? ' — opcional para esta clase' : ''}
            </Form.Label>
            <Form.Control
              placeholder="Ej.: 202, 160a, 500(ii)"
              isInvalid={!!errors.ins}
              {...form.register('ins', {
                validate: (valor) => {
                  const ins = valor.replace(/\s+/g, '');
                  if (!ins)
                    return (
                      !clase ||
                      clase.ins_opcional ||
                      'El número INS es obligatorio para esta clase.'
                    );
                  return PATRON_INS.test(ins) || 'El número INS no es válido.';
                },
              })}
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

export function AditivosReferenciaPage() {
  const route = useCrudRoute<AditivoReferencia>('/aditivos-referencia', getAditivo);
  const list = usePagedList<AditivoReferencia>(
    'aditivos-referencia',
    route.mode === 'listado',
    '',
    'nombre',
  );
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const seleccionado = route.item;

  const reactivar = async (aditivo: AditivoReferencia) => {
    setErrorAccion(null);
    try {
      await guardarAditivo({ activo: true }, aditivo.id);
      list.refetch();
    } catch (err: unknown) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo reactivar.');
    }
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Aditivos de referencia</h2>
      {route.loading && <LoadingSpinner mensaje="Cargando..." />}
      {route.error && <ErrorAlert mensaje={route.error} />}
      {route.mode === 'listado' && (
        <>
          <ListControls {...list} title="Lista de referencia de aditivos">
            <Form.Check
              id="aditivos-inactivos"
              type="switch"
              label="Ver dados de baja"
              checked={list.mostrarInactivos}
              onChange={(e) => list.setMostrarInactivos(e.target.checked)}
            />
            <Button variant="success" onClick={() => route.open()}>
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Nuevo aditivo
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
                    <SortableHeader column="clase_funcional" {...list}>
                      Clase funcional
                    </SortableHeader>
                    <SortableHeader column="nombre" {...list}>
                      Nombre completo
                    </SortableHeader>
                    <SortableHeader column="ins" {...list}>
                      INS
                    </SortableHeader>
                    <SortableHeader column="activo" {...list}>
                      Estado
                    </SortableHeader>
                    <th className="text-center" style={{ width: '150px' }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((aditivo) => (
                    <tr key={aditivo.id}>
                      <td>{aditivo.clase_funcional.nombre}</td>
                      <td>{aditivo.nombre}</td>
                      <td>{aditivo.ins ?? <span className="text-body-secondary">—</span>}</td>
                      <td>
                        <Badge bg={aditivo.activo ? 'success' : 'danger'}>
                          {aditivo.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <MaestroAcciones
                          activo={aditivo.activo}
                          onModificar={() => route.open(aditivo, 'editar')}
                          onBaja={() => route.open(aditivo, 'eliminar')}
                          onReactivar={() => void reactivar(aditivo)}
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
        <AditivoForm aditivo={null} onGuardado={route.back} onCancelar={route.back} />
      )}
      {(route.mode === 'editar' || route.mode === 'ver') && route.item && (
        <AditivoForm aditivo={route.item} onGuardado={route.back} onCancelar={route.back} />
      )}
      {route.mode === 'eliminar' && seleccionado && (
        <ConfirmarBaja
          titulo={`Dar de baja: ${seleccionado.nombre}`}
          descripcion="El aditivo deja de estar disponible para nuevos insumos. Las recetas ya guardadas conservan su clasificación."
          onConfirmar={async () => {
            await bajaAditivo(seleccionado.id);
            route.back();
          }}
          onCancelar={route.back}
        />
      )}
    </Container>
  );
}
