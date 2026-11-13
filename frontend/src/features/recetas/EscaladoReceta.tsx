import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Row, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import type { PrecargaLote } from '../lotesProduccion/types';
import { cantidadConUnidad, numeroDesdeTexto } from './formato';
import { escalarReceta } from './recetaApi';
import type { Escalado, ModoEscalado, RenglonEscalado, Version } from './types';

interface EscaladoRecetaProps {
  recetaId: number;
  version: Version;
}

function EstadoStock({ renglon }: { renglon: RenglonEscalado }) {
  if (!renglon.insumo.activo) return <Badge bg="danger">Insumo dado de baja</Badge>;
  if (renglon.stock_suficiente === null) {
    return (
      <Badge bg="secondary" title="La unidad del renglón no se puede convertir a la del stock">
        Sin comparar
      </Badge>
    );
  }
  return renglon.stock_suficiente ? (
    <Badge bg="success">Alcanza</Badge>
  ) : (
    <Badge bg="danger">No alcanza</Badge>
  );
}

function precargaDesde(escalado: Escalado): PrecargaLote {
  const precargables = escalado.renglones.filter(
    (renglon) => renglon.insumo.activo && renglon.cantidad_en_unidad_stock !== null,
  );
  return {
    recetaId: escalado.receta_id,
    versionId: escalado.version_id,
    versionNumero: escalado.version_numero,
    factor: escalado.factor,
    productoId: escalado.producto.id,
    productoNombre: escalado.producto.nombre,
    cantidad: escalado.cantidad_lote,
    insumos: precargables.map((renglon) => ({
      insumoId: renglon.insumo.id,
      cantidad: renglon.cantidad_en_unidad_stock ?? 0,
    })),
    sinPrecargar: escalado.renglones
      .filter((renglon) => !precargables.includes(renglon))
      .map((renglon) => renglon.insumo.nombre),
  };
}

export function EscaladoReceta({ recetaId, version }: EscaladoRecetaProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [escalado, setEscalado] = useState<Escalado | null>(null);
  const form = useForm<{ modo: ModoEscalado; valor: string }>({
    defaultValues: { modo: 'cantidad_objetivo', valor: '' },
  });
  const { errors, isSubmitting } = form.formState;
  const modo = useWatch({ control: form.control, name: 'modo' });

  const calcular = form.handleSubmit(async ({ modo: modoElegido, valor }) => {
    try {
      setEscalado(await escalarReceta(recetaId, modoElegido, numeroDesdeTexto(valor)));
    } catch (err: unknown) {
      setEscalado(null);
      form.setError('root', {
        message: err instanceof Error ? err.message : 'No se pudo escalar la receta.',
      });
    }
  });

  const vigente = escalado?.version_id === version.id ? escalado : null;

  return (
    <Card className="shadow-sm mb-4 border-primary-subtle">
      <Card.Header className="bg-body fw-semibold">
        <i className="bi bi-calculator me-2" aria-hidden="true" />
        Escalar a mi lote
      </Card.Header>
      <Card.Body>
        <Form noValidate onSubmit={calcular}>
          <Row className="g-3 align-items-end">
            <Col md={5}>
              <Form.Label as="div">¿Cómo querés escalar?</Form.Label>
              <div className="d-flex flex-wrap gap-3">
                <Form.Check
                  id="escalar-modo-cantidad"
                  type="radio"
                  value="cantidad_objetivo"
                  label="Cantidad a elaborar"
                  {...form.register('modo')}
                />
                <Form.Check
                  id="escalar-modo-factor"
                  type="radio"
                  value="factor"
                  label="Factor multiplicador"
                  {...form.register('modo')}
                />
              </div>
            </Col>
            <Col sm={7} md={4}>
              <Form.Label htmlFor="escalar-valor">
                {modo === 'factor' ? 'Factor (ej.: 2 para duplicar)' : 'Cantidad a elaborar'}
              </Form.Label>
              <InputGroup hasValidation>
                {modo === 'factor' && <InputGroup.Text>×</InputGroup.Text>}
                <Form.Control
                  id="escalar-valor"
                  inputMode="decimal"
                  isInvalid={!!errors.valor}
                  {...form.register('valor', {
                    validate: (valor) =>
                      numeroDesdeTexto(valor) > 0 || 'Ingresá un valor mayor a cero.',
                    onChange: () => form.clearErrors('root'),
                  })}
                />
                {modo === 'cantidad_objetivo' && (
                  <InputGroup.Text>{version.rendimiento_unidad.sufijo}</InputGroup.Text>
                )}
                <Form.Control.Feedback type="invalid">
                  {errors.valor?.message}
                </Form.Control.Feedback>
              </InputGroup>
            </Col>
            <Col sm={5} md={3}>
              <Button type="submit" className="w-100" disabled={isSubmitting}>
                {isSubmitting ? 'Calculando...' : 'Calcular'}
              </Button>
            </Col>
          </Row>
          <Form.Text>
            La receta rinde{' '}
            {cantidadConUnidad(version.rendimiento_cantidad, version.rendimiento_unidad.sufijo)}. El
            cálculo no modifica la receta guardada.
          </Form.Text>
          {errors.root && (
            <Alert variant="danger" className="mt-3 mb-0 py-2">
              {errors.root.message}
            </Alert>
          )}
        </Form>

        {vigente && (
          <div className="mt-4">
            <div className="d-flex flex-wrap align-items-center gap-3 mb-2">
              <span>
                Factor{' '}
                <strong>
                  ×{vigente.factor.toLocaleString('es-AR', { maximumFractionDigits: 3 })}
                </strong>
              </span>
              <span>
                Rendimiento esperado{' '}
                <strong>
                  {cantidadConUnidad(
                    vigente.rendimiento_escalado,
                    vigente.rendimiento_unidad.sufijo,
                  )}
                </strong>
              </span>
              {vigente.hay_faltantes && (
                <Badge bg="danger">
                  <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
                  Hay insumos sin stock suficiente
                </Badge>
              )}
            </div>
            <Table responsive size="sm" className="align-middle mb-3">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th className="text-end">Receta</th>
                  <th className="text-end">Para tu lote</th>
                  <th className="text-end">Stock disponible</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {vigente.renglones.map((renglon) => (
                  <tr
                    key={renglon.insumo.id}
                    className={
                      renglon.stock_suficiente === false || !renglon.insumo.activo
                        ? 'table-danger'
                        : undefined
                    }
                  >
                    <td>
                      {renglon.insumo.nombre}
                      {renglon.tipo === 'aditivo' && (
                        <Badge bg="info" text="dark" className="ms-2">
                          Aditivo
                        </Badge>
                      )}
                    </td>
                    <td className="text-end text-nowrap text-body-secondary">
                      {cantidadConUnidad(renglon.cantidad_receta, renglon.unidad_medida.sufijo)}
                    </td>
                    <td className="text-end text-nowrap fw-semibold">
                      {cantidadConUnidad(renglon.cantidad_escalada, renglon.unidad_medida.sufijo)}
                    </td>
                    <td className="text-end text-nowrap">
                      {cantidadConUnidad(renglon.stock_disponible, renglon.unidad_stock.sufijo)}
                    </td>
                    <td>
                      <EstadoStock renglon={renglon} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {currentUser?.operar && (
              <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
                {vigente.hay_faltantes && (
                  <span className="small text-body-secondary">
                    Podés iniciar el lote igual y ajustar las cantidades.
                  </span>
                )}
                <Button
                  variant="success"
                  onClick={() =>
                    navigate('/lotes-produccion/nuevo', {
                      state: { precarga: precargaDesde(vigente) },
                    })
                  }
                >
                  <i className="bi bi-box2 me-1" aria-hidden="true" />
                  Iniciar lote con estas cantidades
                </Button>
              </div>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
