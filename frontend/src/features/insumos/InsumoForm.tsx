import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { useForm, useController } from 'react-hook-form';
import { FormErrors } from '../../shared/components/FormErrors';
import { useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { Insumo, InsumoCreate } from './types';
import { useOptions } from '../../shared/hooks/useOptions';
import type { UnidadMedida } from '../unidadMedida/types';

interface InsumoFormProps {
  insumoInicial?: Insumo | null;
  onGuardar: (datos: InsumoCreate) => Promise<void>;
  onCancelar: () => void;
}

export function InsumoForm({ insumoInicial, onGuardar, onCancelar }: InsumoFormProps) {
  const esEdicion = Boolean(insumoInicial);
  const form = useForm<{ nombre: string; cantidad: number | ''; unidadMedidaId: number | '' }>({
    defaultValues: { nombre: '', cantidad: '', unidadMedidaId: '' },
  });
  const enviando = form.formState.isSubmitting;
  const {
    field: {
      value: nombre,
      onChange: setNombre,
      onBlur: nombreBlur,
      ref: nombreRef,
      name: nombreName,
    },
  } = useController({
    name: 'nombre',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
    },
  });
  const {
    field: {
      value: cantidad,
      onChange: setCantidad,
      onBlur: cantidadBlur,
      ref: cantidadRef,
      name: cantidadName,
    },
  } = useController({
    name: 'cantidad',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
    },
  });
  const {
    field: {
      value: unidadMedidaId,
      onChange: setUnidadMedidaId,
      onBlur: unidadMedidaIdBlur,
      ref: unidadMedidaIdRef,
      name: unidadMedidaIdName,
    },
  } = useController({
    name: 'unidadMedidaId',
    control: form.control,
    rules: {
      validate: (value) =>
        (typeof value === 'string' ? !!value.trim() : Number.isFinite(value)) ||
        'Este campo es obligatorio.',
    },
  });

  const {
    items: unidades,
    loading: loadingUnidades,
    error: optionsError,
  } = useOptions<UnidadMedida>('unidades-medida');

  useEffect(() => {
    if (insumoInicial) {
      setNombre(insumoInicial.nombre);
      setCantidad(insumoInicial.cantidad);
      setUnidadMedidaId(insumoInicial.unidad_medida_id);
    }
  }, [insumoInicial, setNombre, setCantidad, setUnidadMedidaId]);

  const handleSubmit = form.handleSubmit(async () => {
    form.clearErrors('root');
    if (nombre === '' || cantidad === '' || unidadMedidaId === '') return;

    try {
      await onGuardar({
        nombre,
        cantidad: Number(cantidad),
        unidad_medida_id: Number(unidadMedidaId),
      });
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Error al guardar el insumo.',
      });
    }
  });

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion ? `Modificar Insumo: ${insumoInicial?.nombre}` : 'Registrar Nuevo Insumo'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form noValidate onSubmit={handleSubmit}>
          <FormErrors errors={form.formState.errors} />
          {optionsError && (
            <div role="alert" className="text-danger">
              {optionsError}
            </div>
          )}
          <Form.Group controlId="InsumoForm-nombre" className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              type="text"
              required
              ref={nombreRef}
              onBlur={nombreBlur}
              name={nombreName}
              value={nombre}
              isInvalid={!!form.formState.errors.nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Manzanas"
            />
          </Form.Group>

          <Form.Group controlId="InsumoForm-cantidad" className="mb-3">
            <Form.Label>Cantidad</Form.Label>
            <Form.Control
              type="number"
              step="any"
              required
              ref={cantidadRef}
              onBlur={cantidadBlur}
              name={cantidadName}
              value={cantidad}
              isInvalid={!!form.formState.errors.cantidad}
              onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ej: 10"
            />
          </Form.Group>

          <Form.Group controlId="InsumoForm-unidadMedidaId" className="mb-4">
            <Form.Label>Unidad de Medida</Form.Label>
            <SearchableSelect
              required
              ref={unidadMedidaIdRef}
              onBlur={unidadMedidaIdBlur}
              name={unidadMedidaIdName}
              value={unidadMedidaId}
              isInvalid={!!form.formState.errors.unidadMedidaId}
              onChange={(e) =>
                setUnidadMedidaId(e.target.value === '' ? '' : Number(e.target.value))
              }
              disabled={loadingUnidades}
            >
              <option value="">Seleccioná una unidad...</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.sufijo}
                </option>
              ))}
            </SearchableSelect>
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={enviando}>
              {enviando ? 'Guardando...' : esEdicion ? 'Actualizar Cambios' : 'Guardar'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
