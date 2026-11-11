import { useForm } from 'react-hook-form';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { FormErrors } from '../../shared/components/FormErrors';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import type { UnidadMedida } from '../unidadMedida/types';
import { PasosEditor } from './PasosEditor';
import { RenglonesEditor } from './RenglonesEditor';
import type { InsumoDisponible, ProductoResumen, Version } from './types';
import { aDatosVersion, valoresIniciales, type ValoresReceta } from './valoresReceta';

interface RecetaFormProps {
  productos: ProductoResumen[];
  productoInicial: string;
  versionBase?: Version;
  insumos: InsumoDisponible[];
  unidades: UnidadMedida[];
  equipos: { id?: number; nombre: string }[];
  onGuardar: (valores: ValoresReceta, datos: ReturnType<typeof aDatosVersion>) => Promise<void>;
  onCancelar: () => void;
}

const positivo = (valor: string) => Number(valor.replace(',', '.')) > 0;

export function RecetaForm({
  productos,
  productoInicial,
  versionBase,
  insumos,
  unidades,
  equipos,
  onGuardar,
  onCancelar,
}: RecetaFormProps) {
  const esNuevaVersion = Boolean(versionBase);
  const form = useForm<ValoresReceta>({
    defaultValues: valoresIniciales(productoInicial, versionBase),
  });
  const { errors, isSubmitting, submitCount } = form.formState;

  const enviar = form.handleSubmit(async (valores) => {
    if (!valores.renglones.some((renglon) => renglon.tipo === 'ingrediente')) {
      form.setError('root', { message: 'La receta debe tener al menos un ingrediente.' });
      return;
    }
    try {
      await onGuardar(valores, aDatosVersion(valores));
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'No se pudo guardar la receta.',
      });
    }
  });

  const opcionesUnidad = unidades.map((unidad) => (
    <option key={unidad.id} value={unidad.id}>
      {unidad.sufijo}
    </option>
  ));

  return (
    <Form noValidate onSubmit={enviar}>
      <FormErrors key={submitCount} errors={errors} />
      {esNuevaVersion && versionBase && (
        <Alert variant="info" className="py-2">
          Estás modificando la versión {versionBase.numero}. Al guardar se crea la versión{' '}
          {versionBase.numero + 1} y la actual queda archivada en solo lectura.
        </Alert>
      )}

      <Row className="g-4">
        <Col lg={7}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-body fw-semibold">Producto</Card.Header>
            <Card.Body>
              <Form.Group controlId="receta-producto">
                <Form.Label>Producto</Form.Label>
                <SearchableSelect
                  disabled={esNuevaVersion}
                  isInvalid={!!errors.producto_id}
                  {...form.register('producto_id', { required: 'Elegí el producto de la receta.' })}
                >
                  <option value="">Seleccioná un producto...</option>
                  {productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre}
                    </option>
                  ))}
                </SearchableSelect>
                <Form.Text>
                  Cada producto tiene una sola receta. Cada cambio posterior se guarda como una
                  versión nueva y las anteriores quedan en solo lectura.
                </Form.Text>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-body fw-semibold">Rendimiento y porción</Card.Header>
            <Card.Body>
              <Form.Label htmlFor="receta-rendimiento">Rendimiento final</Form.Label>
              <div className="d-flex gap-2 mb-3">
                <Form.Control
                  id="receta-rendimiento"
                  inputMode="decimal"
                  placeholder="Cantidad"
                  isInvalid={!!errors.rendimiento_cantidad}
                  {...form.register('rendimiento_cantidad', {
                    validate: (valor) =>
                      positivo(valor) || 'Indicá el rendimiento final (mayor a cero).',
                  })}
                />
                <Form.Select
                  aria-label="Unidad del rendimiento"
                  style={{ maxWidth: 120 }}
                  isInvalid={!!errors.rendimiento_unidad_id}
                  {...form.register('rendimiento_unidad_id', {
                    required: 'Indicá la unidad del rendimiento.',
                  })}
                >
                  <option value="">—</option>
                  {opcionesUnidad}
                </Form.Select>
              </div>
              <Form.Label htmlFor="receta-porcion">Porción o unidad de venta — opcional</Form.Label>
              <div className="d-flex gap-2 mb-2">
                <Form.Control
                  id="receta-porcion"
                  inputMode="decimal"
                  placeholder="Cantidad"
                  isInvalid={!!errors.porcion_cantidad}
                  {...form.register('porcion_cantidad', {
                    validate: (valor, valores) => {
                      if (!valor.trim())
                        return !valores.porcion_unidad_id || 'Indicá la cantidad de la porción.';
                      return positivo(valor) || 'La porción debe ser mayor a cero.';
                    },
                  })}
                />
                <Form.Select
                  aria-label="Unidad de la porción"
                  style={{ maxWidth: 120 }}
                  isInvalid={!!errors.porcion_unidad_id}
                  {...form.register('porcion_unidad_id', {
                    validate: (valor, valores) =>
                      !!valor ||
                      !valores.porcion_cantidad.trim() ||
                      'Indicá la unidad de la porción.',
                  })}
                >
                  <option value="">—</option>
                  {opcionesUnidad}
                </Form.Select>
              </div>
              <Form.Control
                aria-label="Medida casera"
                placeholder="Medida casera, ej.: 2 rebanadas"
                maxLength={100}
                {...form.register('porcion_medida_casera')}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12}>
          <Card className="shadow-sm">
            <Card.Header className="bg-body fw-semibold">Ingredientes</Card.Header>
            <Card.Body>
              <RenglonesEditor
                form={form}
                tipo="ingrediente"
                insumos={insumos}
                unidades={unidades}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12}>
          <Card className="shadow-sm">
            <Card.Header className="bg-body fw-semibold">Aditivos</Card.Header>
            <Card.Body>
              <RenglonesEditor form={form} tipo="aditivo" insumos={insumos} unidades={unidades} />
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12}>
          <Card className="shadow-sm">
            <Card.Header className="bg-body fw-semibold">Pasos de elaboración</Card.Header>
            <Card.Body>
              <PasosEditor form={form} equipos={equipos} />
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12}>
          <Card className="shadow-sm">
            <Card.Body>
              <Form.Group controlId="receta-motivo" className="mb-3">
                <Form.Label>
                  {esNuevaVersion
                    ? 'Motivo del cambio'
                    : 'Motivo — opcional (por defecto "Versión inicial")'}
                </Form.Label>
                <Form.Control
                  placeholder={
                    esNuevaVersion
                      ? 'Ej.: Ajuste de hidratación por cambio de harina'
                      : 'Versión inicial'
                  }
                  maxLength={500}
                  isInvalid={!!errors.motivo}
                  {...form.register('motivo', {
                    validate: (valor) =>
                      !esNuevaVersion || !!valor.trim() || 'Indicá el motivo del cambio.',
                  })}
                />
              </Form.Group>
              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={onCancelar} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? 'Guardando...'
                    : esNuevaVersion
                      ? `Guardar como versión ${(versionBase?.numero ?? 0) + 1}`
                      : 'Crear receta'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Form>
  );
}
