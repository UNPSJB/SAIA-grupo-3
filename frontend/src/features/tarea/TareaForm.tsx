import { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { Tarea } from './types';

interface TareaFormProps {
  tareaInicial?: Tarea | null;
  onGuardar: (datos: Tarea) => Promise<void>;
  onCancelar: () => void;
}

export function TareaForm({ tareaInicial, onGuardar, onCancelar }: TareaFormProps) {
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (tareaInicial) setDescripcion(tareaInicial.descripcion);
  }, [tareaInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) return;

    setEnviando(true);
    try {
      await onGuardar({ descripcion: descripcion.trim() });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar los datos.');
    } finally {
      setEnviando(false);
    }
  };

  const esEdicion = Boolean(tareaInicial);

  return (
    <Card className="shadow-sm border-0">
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion ? `Modificar Tarea #${tareaInicial?.id}` : 'Registrar Nueva Tarea'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              required
              maxLength={250}
              placeholder="Describa la tarea (máximo 250 caracteres)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
            <Form.Text className="text-muted">{descripcion.length}/250 caracteres</Form.Text>
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancelar} disabled={enviando}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={enviando}>
              {enviando ? 'Guardando...' : esEdicion ? 'Actualizar Cambios' : 'Guardar'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}