import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button, Card, Form, InputGroup, Modal } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { FormErrors } from '../../shared/components/FormErrors';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { fechaHoyIso } from '../../shared/libreria/fechas';
import { ProductoForm } from '../productos/ProductoForm';
import { createProducto, getProductosActivos } from '../productos/productoApi';
import type { Producto, ProductoCreate } from '../productos/types';
import type { LoteProduccionCreate } from './types';

interface LoteProduccionFormProps {
  onGuardar: (datos: LoteProduccionCreate) => Promise<void>;
  onCancelar: () => void;
}

interface ValoresLote {
  productoId: string;
  fechaProduccion: string;
  cantidad: string;
  observaciones: string;
}

export function LoteProduccionForm({ onGuardar, onCancelar }: LoteProduccionFormProps) {
  const hoy = fechaHoyIso();
  const form = useForm<ValoresLote>({
    defaultValues: { productoId: '', fechaProduccion: hoy, cantidad: '', observaciones: '' },
  });
  const { errors, isSubmitting, submitCount } = form.formState;
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);
  const [mostrarNuevoProducto, setMostrarNuevoProducto] = useState(false);

  useEffect(() => {
    let activo = true;
    getProductosActivos()
      .then((datos) => {
        if (activo) setProductos(datos);
      })
      .catch((err: unknown) => {
        if (activo)
          setErrorProductos(
            err instanceof Error ? err.message : 'No se pudieron cargar los productos.',
          );
      })
      .finally(() => {
        if (activo) setCargandoProductos(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const productoId = useWatch({ control: form.control, name: 'productoId' });
  const productoElegido = productos.find((producto) => String(producto.id) === productoId);

  const crearProducto = async (datos: ProductoCreate) => {
    const nuevo = await createProducto(datos);
    setProductos((actuales) =>
      [...actuales, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    form.setValue('productoId', String(nuevo.id));
    form.clearErrors('productoId');
    setMostrarNuevoProducto(false);
  };

  const enviar = form.handleSubmit(async (valores) => {
    try {
      await onGuardar({
        producto_id: Number(valores.productoId),
        fecha_produccion: valores.fechaProduccion,
        cantidad: Number(valores.cantidad),
        observaciones: valores.observaciones.trim() || null,
      });
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Error al registrar el lote.',
      });
    }
  });

  return (
    <>
      <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
        <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
          Registrar Lote de Producción
        </Card.Header>
        <Card.Body className="p-4">
          <Form noValidate onSubmit={enviar}>
            <FormErrors key={submitCount} errors={errors} />
            {errorProductos && <ErrorAlert mensaje={errorProductos} />}
            <Form.Group controlId="LoteForm-producto" className="mb-3">
              <div className="d-flex justify-content-between align-items-end mb-2">
                <Form.Label className="mb-0">Producto</Form.Label>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={() => setMostrarNuevoProducto(true)}
                  className="d-flex align-items-center gap-1"
                >
                  <i className="bi bi-plus-lg"></i> Nuevo producto
                </Button>
              </div>
              <SearchableSelect
                isInvalid={!!errors.productoId}
                disabled={cargandoProductos}
                {...form.register('productoId', { required: 'Elegí el producto que se produjo.' })}
                value={productoId}
              >
                <option value="">
                  {cargandoProductos ? 'Cargando productos...' : 'Seleccioná un producto...'}
                </option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre}
                  </option>
                ))}
              </SearchableSelect>
              {!cargandoProductos && productos.length === 0 && (
                <Form.Text>
                  Todavía no hay productos: creá el primero con “Nuevo producto”.
                </Form.Text>
              )}
            </Form.Group>
            <div className="row">
              <Form.Group controlId="LoteForm-fecha" className="col-sm-6 mb-3">
                <Form.Label>Fecha de producción</Form.Label>
                <Form.Control
                  type="date"
                  max={hoy}
                  isInvalid={!!errors.fechaProduccion}
                  {...form.register('fechaProduccion', {
                    required: 'Indicá la fecha de producción.',
                    validate: (valor) =>
                      valor <= hoy || 'La fecha de producción no puede ser posterior a hoy.',
                  })}
                />
              </Form.Group>
              <Form.Group controlId="LoteForm-cantidad" className="col-sm-6 mb-3">
                <Form.Label>Cantidad producida</Form.Label>
                <InputGroup hasValidation>
                  <Form.Control
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Ej: 24"
                    isInvalid={!!errors.cantidad}
                    {...form.register('cantidad', {
                      required: 'Indicá la cantidad producida.',
                      validate: (valor) =>
                        Number(valor) > 0 || 'La cantidad debe ser mayor a cero.',
                    })}
                  />
                  {productoElegido && (
                    <InputGroup.Text>{productoElegido.unidad_medida.sufijo}</InputGroup.Text>
                  )}
                </InputGroup>
              </Form.Group>
            </div>
            <Form.Group controlId="LoteForm-observaciones" className="mb-4">
              <Form.Label>Observaciones (opcional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Ej: Horneado en el turno mañana"
                isInvalid={!!errors.observaciones}
                {...form.register('observaciones', {
                  maxLength: {
                    value: 500,
                    message: 'Las observaciones no pueden superar los 500 caracteres.',
                  },
                })}
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={onCancelar} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Registrando...' : 'Registrar lote'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Modal show={mostrarNuevoProducto} onHide={() => setMostrarNuevoProducto(false)} centered>
        <Modal.Header closeButton className="bg-body-tertiary">
          <Modal.Title className="text-secondary fs-5">Nuevo producto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {mostrarNuevoProducto && (
            <ProductoForm
              enModal
              onGuardar={crearProducto}
              onCancelar={() => setMostrarNuevoProducto(false)}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
