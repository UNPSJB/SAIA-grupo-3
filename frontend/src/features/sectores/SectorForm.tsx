import { useForm, useController } from 'react-hook-form';
import { FormErrors } from '../../shared/components/FormErrors';
import { useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { Sector } from './types';

interface SectorFormProps {
  sectorInicial?: Sector | null;
  onGuardar: (datos: Sector) => Promise<void>;
  onCancelar: () => void;
}

export function SectorForm({ sectorInicial, onGuardar, onCancelar }: SectorFormProps) {
  const esEdicion = Boolean(sectorInicial);
  const form = useForm<{ nombre: string }>({ defaultValues: { nombre: '' } });
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
    rules: { validate: (value) => !!value.trim() || 'Este campo es obligatorio.' },
  });

  useEffect(() => {
    if (sectorInicial) setNombre(sectorInicial.nombre);
  }, [sectorInicial, setNombre]);

  const handleSubmit = form.handleSubmit(async () => {
    form.clearErrors('root');
    if (!nombre.trim()) return;

    try {
      await onGuardar({ nombre: nombre.trim() });
    } catch (err: unknown) {
      form.setError('root', { message: err instanceof Error ? err.message : 'Error al guardar.' });
    }
  });

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion ? `Modificar Sector: ${sectorInicial?.nombre}` : 'Registrar Nuevo Sector'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form noValidate onSubmit={handleSubmit}>
          <FormErrors errors={form.formState.errors} />
          <Form.Group controlId="SectorForm-nombre" className="mb-4">
            <Form.Label>Nombre del Sector</Form.Label>
            <Form.Control
              type="text"
              required
              placeholder="Ej. Mantenimiento"
              ref={nombreRef}
              onBlur={nombreBlur}
              name={nombreName}
              value={nombre}
              isInvalid={!!form.formState.errors.nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">
              {form.formState.errors.nombre?.message}
            </Form.Control.Feedback>
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={enviando}>
              {enviando ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
