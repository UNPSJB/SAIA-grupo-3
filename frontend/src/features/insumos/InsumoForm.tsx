import { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { Insumo, InsumoCreate } from './types';
import { useUnidadMedida } from '../unidadMedida/useUnidadMedida';

interface InsumoFormProps {
  insumoInicial?: Insumo | null;
  onGuardar: (datos: InsumoCreate) => Promise<void>;
  onCancelar: () => void;
}

export function InsumoForm({ insumoInicial, onGuardar, onCancelar }: InsumoFormProps) {
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState<number | ''>('');
  const [unidadMedidaId, setUnidadMedidaId] = useState<number | ''>('');
  const [enviando, setEnviando] = useState(false);

  const { unidades, loading: loadingUnidades } = useUnidadMedida();

  useEffect(() => {
    if (insumoInicial) {
      setNombre(insumoInicial.nombre);
      setCantidad(insumoInicial.cantidad);
      setUnidadMedidaId(insumoInicial.unidad_medida_id);
    }
  }, [insumoInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre === '' || cantidad === '' || unidadMedidaId === '') return;

    setEnviando(true);
    try {
      await onGuardar({
        nombre,
        cantidad: Number(cantidad),
        unidad_medida_id: Number(unidadMedidaId),
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar el insumo.');
    } finally {
      setEnviando(false);
    }
  };

  const esEdicion = Boolean(insumoInicial);

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion ? `Modificar Insumo: ${insumoInicial?.nombre}` : 'Registrar Nuevo Insumo'}
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
              placeholder="Ej: Manzanas"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Cantidad</Form.Label>
            <Form.Control 
              type="number" 
              step="any"
              required 
              value={cantidad} 
              onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))} 
              placeholder="Ej: 10"
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Unidad de Medida</Form.Label>
            <Form.Select 
              required 
              value={unidadMedidaId} 
              onChange={(e) => setUnidadMedidaId(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={loadingUnidades}
            >
              <option value="">Seleccioná una unidad...</option>
              {unidades.map((u: any) => (
                <option key={u.id} value={u.id}>
                 {u.sufijo}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancelar} disabled={enviando}>Cancelar</Button>
            <Button variant="success" type="submit" disabled={enviando}>
              {enviando ? 'Guardando...' : esEdicion ? 'Actualizar Cambios' : 'Guardar'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}