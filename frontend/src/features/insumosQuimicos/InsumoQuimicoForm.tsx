import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { useForm, useController } from 'react-hook-form';
import { FormErrors } from '../../shared/components/FormErrors';
import { useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { InsumoQuimico, InsumoQuimicoCreate, TipoQuimico } from './types';
import { TIPOS_QUIMICOS } from './types';
import { useOptions } from '../../shared/hooks/useOptions';
import type { UnidadMedida } from '../unidadMedida/types';

interface InsumoQuimicoFormProps {
  insumoInicial?: InsumoQuimico | null;
  onGuardar: (datos: InsumoQuimicoCreate) => Promise<void>;
  onCancelar: () => void;
}

export function InsumoQuimicoForm({
  insumoInicial,
  onGuardar,
  onCancelar,
}: InsumoQuimicoFormProps) {
  const esEdicion = Boolean(insumoInicial);
  const form = useForm<{
    nombre: string;
    cantidad: number | '';
    stockMinimo: number | '';
    tipoQuimico: TipoQuimico;
    unidadMedidaId: number | '';
  }>({
    defaultValues: { nombre: '', cantidad: '', stockMinimo: '', tipoQuimico: 'detergente', unidadMedidaId: '' },
  });
  const enviando = form.formState.isSubmitting;
  const { field: minimo } = useController({
    name: 'stockMinimo',
    control: form.control,
    rules: { validate: (v) => v === '' || (Number.isFinite(v) && v >= 0) || 'Ingresá un mínimo válido, igual o mayor que cero.' },
  });
  const { setValue } = form;
  useEffect(() => {
    setValue('stockMinimo', insumoInicial?.stock_minimo ?? '');
  }, [insumoInicial, setValue]);

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
      min: { value: 0, message: 'Valor demasiado pequeño.' },
    },
  });
  const {
    field: {
      value: tipoQuimico,
      onChange: setTipoQuimico,
      onBlur: tipoQuimicoBlur,
      ref: tipoQuimicoRef,
      name: tipoQuimicoName,
    },
  } = useController({
    name: 'tipoQuimico',
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
      setTipoQuimico(insumoInicial.tipo_quimico);
      setUnidadMedidaId(insumoInicial.unidad_medida_id);
    }
  }, [insumoInicial, setNombre, setCantidad, setTipoQuimico, setUnidadMedidaId]);

  const handleSubmit = form.handleSubmit(async () => {
    form.clearErrors('root');
    if (!nombre.trim() || cantidad === '' || unidadMedidaId === '') return;

    try {
      await onGuardar({
        nombre: nombre.trim(),
        cantidad: Number(cantidad),
        stock_minimo: minimo.value === '' ? null : Number(minimo.value),
        tipo_quimico: tipoQuimico,
        unidad_medida_id: Number(unidadMedidaId),
      });
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Error al guardar el insumo químico.',
      });
    }
  });

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
        {esEdicion
          ? `Modificar Químico: ${insumoInicial?.nombre}`
          : 'Registrar Nuevo Insumo Químico'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form noValidate onSubmit={handleSubmit}>
          <FormErrors key={form.formState.submitCount} errors={form.formState.errors} />
          {optionsError && (
            <div role="alert" className="text-danger">
              {optionsError}
            </div>
          )}
          <Form.Group controlId="InsumoQuimicoForm-nombre" className="mb-3">
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
              placeholder="Ej: Hipoclorito de Sodio 55g/L"
            />
          </Form.Group>

          <div className="row">
            <Form.Group controlId="InsumoQuimicoForm-cantidad" className="col-md-6 mb-3">
              <Form.Label>Cantidad</Form.Label>
              <Form.Control
                type="number"
                step="any"
                required
                min={0}
                ref={cantidadRef}
                onBlur={cantidadBlur}
                name={cantidadName}
                value={cantidad}
                isInvalid={!!form.formState.errors.cantidad}
                onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej: 20"
              />
            </Form.Group>

            <Form.Group controlId="InsumoQuimicoForm-tipoQuimico" className="col-md-6 mb-3">
              <Form.Label>Tipo de Químico</Form.Label>
              <SearchableSelect
                required
                ref={tipoQuimicoRef}
                onBlur={tipoQuimicoBlur}
                name={tipoQuimicoName}
                value={tipoQuimico}
                isInvalid={!!form.formState.errors.tipoQuimico}
                onChange={(e) => setTipoQuimico(e.target.value as TipoQuimico)}
              >
                {TIPOS_QUIMICOS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SearchableSelect>
            </Form.Group>
          </div>

          <Form.Group controlId="InsumoQuimicoForm-unidadMedidaId" className="mb-4">
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
              <option value="">Seleccione una unidad...</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.sufijo} ({u.tipo})
                </option>
              ))}
            </SearchableSelect>
          </Form.Group>

          <Form.Group controlId="InsumoQuimicoForm-stockMinimo" className="mb-4">
            <Form.Label>Stock mínimo — opcional</Form.Label>
            <Form.Control
              {...minimo}
              type="number"
              min="0"
              step="any"
              placeholder="Sin mínimo definido"
              isInvalid={!!form.formState.errors.stockMinimo}
              onChange={(e) => minimo.onChange(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <Form.Text>
              En {unidades.find((u) => u.id === Number(unidadMedidaId))?.sufijo ?? 'la unidad seleccionada'}.
              Avisamos al llegar a este valor o quedar por debajo. Dejalo vacío para desactivar el aviso.
            </Form.Text>
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
