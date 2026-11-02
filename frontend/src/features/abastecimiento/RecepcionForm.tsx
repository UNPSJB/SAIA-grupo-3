import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import { fechaHoyIso } from '../../shared/libreria/fechas';
import { cargarOpciones, guardarLote } from './abastecimientoApi';
import type { LoteRecepcion } from './types';
import { useConsulta } from './useConsulta';

export function RecepcionForm({
  inicial,
  conciliar,
  onGuardado,
  onCancelar,
}: {
  inicial: LoteRecepcion | null;
  conciliar: boolean;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [params] = useSearchParams();
  const opciones = useConsulta(cargarOpciones);
  const [datos, setDatos] = useState(() => ({
    insumo_id: inicial ? String(inicial.insumo_id) : params.get('insumo_id') ?? '',
    proveedor_id: inicial ? String(inicial.proveedor_id) : '',
    numero_lote: inicial?.numero_lote ?? '',
    cantidad: inicial ? String(inicial.cantidad) : '',
    fecha_recepcion: inicial?.fecha_recepcion ?? fechaHoyIso(),
    fecha_vencimiento: inicial?.fecha_vencimiento ?? '',
    clave_operacion: inicial?.clave_operacion ?? crypto.randomUUID(),
  }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const insumos = (opciones.datos?.insumos ?? []).map((i) => ({
    id: i.id,
    nombre: i.nombre,
    unidad: i.unidadMedidaObj?.sufijo ?? '',
  }));
  const proveedores = (opciones.datos?.proveedores ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
  }));
  if (inicial && !insumos.some((i) => i.id === inicial.insumo_id))
    insumos.push({ id: inicial.insumo_id, nombre: inicial.insumo_nombre, unidad: inicial.unidad });
  if (inicial && !proveedores.some((p) => p.id === inicial.proveedor_id))
    proveedores.push({ id: inicial.proveedor_id, nombre: inicial.proveedor_nombre });
  const unidad = insumos.find((i) => i.id === Number(datos.insumo_id))?.unidad;

  function cambiar(campo: keyof typeof datos, valor: string) {
    setDatos((anteriores) => ({ ...anteriores, [campo]: valor }));
  }
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!Number.isFinite(Number(datos.cantidad)) || Number(datos.cantidad) <= 0) {
      setError('La cantidad debe ser mayor que cero.');
      return;
    }
    setGuardando(true);
    try {
      await guardarLote(
        {
          ...datos,
          insumo_id: Number(datos.insumo_id),
          proveedor_id: Number(datos.proveedor_id),
          cantidad: Number(datos.cantidad),
          numero_lote: datos.numero_lote.trim(),
        },
        inicial?.id,
        conciliar,
      );
      onGuardado();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar la recepción.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
        {inicial
          ? 'Editar recepción'
          : conciliar
            ? 'Identificar stock anterior'
            : 'Registrar recepción'}
      </Card.Header>
      <Card.Body className="p-4">
        {conciliar && (
          <Alert variant="info">
            Identificá solamente cantidades y datos de origen que puedas verificar. Esta operación
            no vuelve a sumar el stock.
          </Alert>
        )}
        {error && <Alert variant="danger">{error}</Alert>}
        {opciones.error && (
          <Alert variant="danger">
            {opciones.error}{' '}
            <Button variant="link" onClick={opciones.recargar}>
              Reintentar
            </Button>
          </Alert>
        )}
        {opciones.cargando && <p role="status">Cargando opciones...</p>}
        <Form onSubmit={enviar}>
          <fieldset disabled={guardando || opciones.cargando || Boolean(opciones.error)}>
            <div className="row g-3">
              <Form.Group className="col-12" controlId="recepcion-insumo">
                <Form.Label>Insumo *</Form.Label>
                <Form.Select
                  required
                  disabled={Boolean(inicial)}
                  value={datos.insumo_id}
                  onChange={(e) => cambiar('insumo_id', e.target.value)}
                >
                  <option value="">Seleccionar insumo</option>
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nombre} ({i.unidad})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="col-12" controlId="recepcion-proveedor">
                <Form.Label>Proveedor *</Form.Label>
                <Form.Select
                  required
                  disabled={Boolean(inicial)}
                  value={datos.proveedor_id}
                  onChange={(e) => cambiar('proveedor_id', e.target.value)}
                >
                  <option value="">Seleccionar proveedor activo</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="col-12" controlId="recepcion-numero">
                <Form.Label>Número de lote del proveedor *</Form.Label>
                <Form.Control
                  required
                  maxLength={100}
                  value={datos.numero_lote}
                  onChange={(e) => cambiar('numero_lote', e.target.value)}
                />
              </Form.Group>
              <Form.Group className="col-12" controlId="recepcion-cantidad">
                <Form.Label>Cantidad {unidad ? `(${unidad})` : ''} *</Form.Label>
                <Form.Control
                  required
                  type="number"
                  min="0"
                  step="any"
                  value={datos.cantidad}
                  onChange={(e) => cambiar('cantidad', e.target.value)}
                />
                <Form.Text>Mayor que cero, expresada en la unidad del insumo.</Form.Text>
              </Form.Group>
              <Form.Group className="col-12 col-md-6" controlId="recepcion-fecha">
                <Form.Label>Fecha de recepción *</Form.Label>
                <Form.Control
                  required
                  type="date"
                  max={fechaHoyIso()}
                  value={datos.fecha_recepcion}
                  onChange={(e) => cambiar('fecha_recepcion', e.target.value)}
                />
              </Form.Group>
              <Form.Group className="col-12 col-md-6" controlId="recepcion-vencimiento">
                <Form.Label>Fecha de vencimiento *</Form.Label>
                <Form.Control
                  required
                  type="date"
                  min={datos.fecha_recepcion}
                  value={datos.fecha_vencimiento}
                  onChange={(e) => cambiar('fecha_vencimiento', e.target.value)}
                />
              </Form.Group>
            </div>
          </fieldset>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button variant="secondary" disabled={guardando} onClick={onCancelar}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                guardando || opciones.cargando || Boolean(opciones.error) || !opciones.datos
              }
            >
              {guardando
                ? 'Guardando...'
                : inicial
                  ? 'Actualizar Cambios'
                  : conciliar
                    ? 'Identificar sin sumar stock'
                    : 'Registrar y sumar al stock'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
