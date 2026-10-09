import { useForm, useController } from 'react-hook-form';
import { FormErrors } from '../../shared/components/FormErrors';
import { Card, Form, Button } from 'react-bootstrap';
import type { Elemento } from './types';

interface ElementoFormProps {
  elementoInicial?: Elemento | null;
  onGuardar: (datos: Elemento) => Promise<void>;
  onCancelar: () => void;
}

export function ElementoForm({ elementoInicial, onGuardar, onCancelar }: ElementoFormProps) {
  const esEdicion = Boolean(elementoInicial);
  const form = useForm<{ nombre: string; frecuenciaRecambio: number | '' }>({
    defaultValues: {
      nombre: elementoInicial?.nombre ?? '',
      frecuenciaRecambio: elementoInicial?.frecuencia_recambio ?? '',
    },
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
      value: frecuenciaRecambio,
      onChange: setFrecuenciaRecambio,
      onBlur: frecuenciaRecambioBlur,
      ref: frecuenciaRecambioRef,
      name: frecuenciaRecambioName,
    },
  } = useController({
    name: 'frecuenciaRecambio',
    control: form.control,
    rules: { min: { value: 1, message: 'Valor demasiado pequeño.' } },
  });

  const handleSubmit = form.handleSubmit(async () => {
    form.clearErrors('root');
    if (!nombre.trim()) return;

    try {
      await onGuardar({
        nombre: nombre.trim(),
        frecuencia_recambio: frecuenciaRecambio === '' ? null : Number(frecuenciaRecambio),
      });
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Error al guardar los datos.',
      });
    }
  });

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion ? `Modificar Elemento: ${elementoInicial?.nombre}` : 'Registrar Nuevo Elemento'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form noValidate onSubmit={handleSubmit}>
          <FormErrors errors={form.formState.errors} />
          <div className="row">
            <Form.Group controlId="ElementoForm-nombre" className="col-md-6 mb-3">
              <Form.Label>Nombre del elemento</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="Ej. Cepillo de cerdas suaves"
                ref={nombreRef}
                onBlur={nombreBlur}
                name={nombreName}
                value={nombre}
                isInvalid={!!form.formState.errors.nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="ElementoForm-frecuenciaRecambio" className="col-md-6 mb-4">
              <Form.Label>Frecuencia de recambio (días)</Form.Label>
              <Form.Control
                type="number"
                min={1}
                placeholder="Opcional"
                ref={frecuenciaRecambioRef}
                onBlur={frecuenciaRecambioBlur}
                name={frecuenciaRecambioName}
                value={frecuenciaRecambio}
                isInvalid={!!form.formState.errors.frecuenciaRecambio}
                onChange={(e) =>
                  setFrecuenciaRecambio(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </Form.Group>
          </div>

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
