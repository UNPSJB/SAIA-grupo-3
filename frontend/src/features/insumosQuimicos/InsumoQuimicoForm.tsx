import { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { InsumoQuimico, InsumoQuimicoCreate, TipoQuimico } from './types';
import { TIPOS_QUIMICOS } from './types';
import { useUnidadMedida } from '../unidadMedida/useUnidadMedida';

interface InsumoQuimicoFormProps {
  insumoInicial?: InsumoQuimico | null;
  onGuardar: (datos: InsumoQuimicoCreate) => Promise<void>;
  onCancelar: () => void;
}

export function InsumoQuimicoForm({ insumoInicial, onGuardar, onCancelar }: InsumoQuimicoFormProps) {
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState<number | ''>('');
  const [tipoQuimico, setTipoQuimico] = useState<TipoQuimico>('detergente');
  const [unidadMedidaId, setUnidadMedidaId] = useState<number | ''>('');
  const [enviando, setEnviando] = useState(false);

  const { unidades, loading: loadingUnidades } = useUnidadMedida();

  useEffect(() => {
    if (insumoInicial) {
      setNombre(insumoInicial.nombre);
      setCantidad(insumoInicial.cantidad);
      setTipoQuimico(insumoInicial.tipo_quimico);
      setUnidadMedidaId(insumoInicial.unidad_medida_id);
    }
  }, [insumoInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || cantidad === '' || unidadMedidaId === '') return;

    setEnviando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        cantidad: Number(cantidad),
        tipo_quimico: tipoQuimico,
        unidad_medida_id: Number(unidadMedidaId),
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar el insumo químico.');
    } finally {
      setEnviando(false);
    }
  };

  const esEdicion = Boolean(insumoInicial);

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion ? `Modificar Químico: ${insumoInicial?.nombre}` : 'Registrar Nuevo Insumo Químico'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Hipoclorito de Sodio 55g/L"
            />
          </Form.Group>

          <div className="row">
            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Cantidad</Form.Label>
              <Form.Control
                type="number"
                step="any"
                required
                min={0}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej: 20"
              />
            </Form.Group>

            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Tipo de Químico</Form.Label>
              <Form.Select
                required
                value={tipoQuimico}
                onChange={(e) => setTipoQuimico(e.target.value as TipoQuimico)}
              >
                {TIPOS_QUIMICOS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>

          <Form.Group className="mb-4">
            <Form.Label>Unidad de Medida</Form.Label>
            <Form.Select
              required
              value={unidadMedidaId}
              onChange={(e) => setUnidadMedidaId(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={loadingUnidades}
            >
              <option value="">Seleccione una unidad...</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.sufijo} ({u.tipo})
                </option>
              ))}
            </Form.Select>
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