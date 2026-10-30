import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Form } from 'react-bootstrap';
import { FormErrors } from '../../shared/components/FormErrors';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { getUnidadesMedidaActivas } from '../unidadMedida/unidadMedidaApi';
import type { UnidadMedida } from '../unidadMedida/types';
import type { Producto, ProductoCreate } from './types';

interface ProductoFormProps {
  productoInicial?: Producto | null;
  onGuardar: (datos: ProductoCreate) => Promise<void>;
  onCancelar: () => void;
  enModal?: boolean;
}

interface ValoresProducto {
  nombre: string;
  descripcion: string;
  unidadMedidaId: string;
}

export function ProductoForm({
  productoInicial,
  onGuardar,
  onCancelar,
  enModal = false,
}: ProductoFormProps) {
  const esEdicion = Boolean(productoInicial);
  const form = useForm<ValoresProducto>({
    defaultValues: {
      nombre: productoInicial?.nombre ?? '',
      descripcion: productoInicial?.descripcion ?? '',
      unidadMedidaId: productoInicial ? String(productoInicial.unidad_medida_id) : '',
    },
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [errorUnidades, setErrorUnidades] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getUnidadesMedidaActivas()
      .then((datos) => {
        if (activo) setUnidades(datos);
      })
      .catch((err: unknown) => {
        if (activo)
          setErrorUnidades(
            err instanceof Error ? err.message : 'No se pudieron cargar las unidades.',
          );
      });
    return () => {
      activo = false;
    };
  }, []);

  const enviar = form.handleSubmit(async (valores) => {
    try {
      await onGuardar({
        nombre: valores.nombre.trim(),
        descripcion: valores.descripcion.trim() || null,
        unidad_medida_id: Number(valores.unidadMedidaId),
      });
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Error al guardar el producto.',
      });
    }
  });

  const campos = (
    <Form noValidate onSubmit={enviar}>
      <FormErrors key={submitCount} errors={errors} />
      {errorUnidades && <ErrorAlert mensaje={errorUnidades} />}
      <Form.Group controlId="ProductoForm-nombre" className="mb-3">
        <Form.Label>Nombre</Form.Label>
        <Form.Control
          type="text"
          placeholder="Ej: Pan de molde"
          isInvalid={!!errors.nombre}
          autoFocus={enModal}
          {...form.register('nombre', {
            validate: (valor) => !!valor.trim() || 'El nombre del producto es obligatorio.',
            maxLength: { value: 100, message: 'El nombre no puede superar los 100 caracteres.' },
          })}
        />
      </Form.Group>
      <Form.Group controlId="ProductoForm-unidad" className="mb-3">
        <Form.Label>Unidad de medida</Form.Label>
        <Form.Select
          isInvalid={!!errors.unidadMedidaId}
          disabled={unidades.length === 0}
          {...form.register('unidadMedidaId', {
            required: 'Elegí la unidad en la que se mide el producto.',
          })}
        >
          <option value="">Seleccioná una unidad...</option>
          {unidades.map((unidad) => (
            <option key={unidad.id} value={unidad.id}>
              {unidad.sufijo}
            </option>
          ))}
        </Form.Select>
        <Form.Text>Es la unidad en la que se registra la cantidad de cada lote.</Form.Text>
      </Form.Group>
      <Form.Group controlId="ProductoForm-descripcion" className="mb-4">
        <Form.Label>Descripción (opcional)</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          placeholder="Ej: Pan de molde de 500 g en bolsa"
          isInvalid={!!errors.descripcion}
          {...form.register('descripcion', {
            maxLength: {
              value: 250,
              message: 'La descripción no puede superar los 250 caracteres.',
            },
          })}
        />
      </Form.Group>
      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onCancelar} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : esEdicion ? 'Actualizar Cambios' : 'Guardar'}
        </Button>
      </div>
    </Form>
  );

  if (enModal) return campos;

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
        {esEdicion ? `Modificar Producto: ${productoInicial?.nombre}` : 'Registrar Nuevo Producto'}
      </Card.Header>
      <Card.Body className="p-4">{campos}</Card.Body>
    </Card>
  );
}
