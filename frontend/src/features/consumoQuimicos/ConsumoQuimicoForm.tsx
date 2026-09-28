import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import type { ConsumoQuimico } from './types';
import { getInsumosQuimicos } from '../insumosQuimicos/insumoQuimicoApi';

interface ConsumoQuimicoFormProps {
  consumoInicial?: ConsumoQuimico | null;
  onGuardar: (datos: ConsumoQuimico) => Promise<void>;
  onCancelar: () => void;
}

export function ConsumoQuimicoForm({ consumoInicial, onGuardar, onCancelar }: ConsumoQuimicoFormProps) {
  const [insumoId, setInsumoId] = useState<number | ''>('');
  const [cantidad, setCantidad] = useState<number | ''>('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tarea, setTarea] = useState('');
  
  const [insumos, setInsumos] = useState<any[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

  useEffect(() => {
    getInsumosQuimicos(1, 100)
      .then(data => {
        if (data && data.items) setInsumos(data.items);
      })
      .catch(() => setErrorBackend('Atención: No se pudieron cargar los insumos químicos del servidor.'));
  }, []);

  useEffect(() => {
    if (consumoInicial) {
      setInsumoId(consumoInicial.insumo_quimico_id);
      setCantidad(consumoInicial.cantidad_utilizada);
      setFecha(consumoInicial.fecha);
      setTarea(consumoInicial.tarea_limpieza || '');
    }
  }, [consumoInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumoId || cantidad === '' || !fecha || !tarea.trim()) return;
    setEnviando(true);
    setErrorBackend(null);
    try {
      await onGuardar({
        insumo_quimico_id: Number(insumoId),
        cantidad_utilizada: Number(cantidad),
        fecha,
        tarea_limpieza: tarea
      });
    } catch (err: unknown) {
      setErrorBackend(err instanceof Error ? err.message : 'Error al guardar');
      setEnviando(false);
    }
  };

  const esEdicion = Boolean(consumoInicial);
  const insumoSeleccionado = insumos.find(i => i.id === insumoId);
  const sufijoUnidad = insumoSeleccionado?.unidadMedidaObj?.sufijo || '';

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion ? 'Modificar Consumo Registrado' : 'Registrar Consumo Diario'}
      </Card.Header>
      <Card.Body className="p-4">
        {errorBackend && (
          <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <div className="ms-2">{errorBackend}</div>
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Insumo Químico Utilizado</Form.Label>
            <Form.Select required value={insumoId} onChange={e => setInsumoId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Seleccione el químico...</option>
              {insumos.map(i => (
                <option key={i.id} value={i.id}>
                  {i.nombre} (Stock actual: {i.cantidad} {i.unidadMedidaObj?.sufijo})
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Cantidad Aproximada</Form.Label>
            <InputGroup>
              <Form.Control 
                type="number" 
                step="any" 
                min={0} 
                required 
                value={cantidad} 
                onChange={e => setCantidad(e.target.value === '' ? '' : Number(e.target.value))} 
                placeholder="Ej: 0.5"
              />
              {/* Aquí mostramos el cartelito con la unidad pegado al input */}
              {insumoId !== '' && sufijoUnidad && (
                <InputGroup.Text className="bg-light text-secondary fw-bold">
                  {sufijoUnidad}
                </InputGroup.Text>
              )}
            </InputGroup>
            <Form.Text className="text-muted">
              Por favor, indique el consumo respetando la unidad de medida mostrada a la derecha.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Fecha</Form.Label>
            <Form.Control type="date" required value={fecha} onChange={e => setFecha(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label>Tarea de Limpieza Asociada</Form.Label>
            <Form.Control type="text" required placeholder="Ej: Limpieza de línea de cocción A" value={tarea} onChange={e => setTarea(e.target.value)} />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancelar} disabled={enviando}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={enviando}>
              {enviando ? 'Guardando...' : esEdicion ? 'Actualizar Cambios' : 'Registrar Consumo'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}