import { useState } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { Elemento } from './types';

interface ElementoFormProps {
  elementoInicial?: Elemento | null;
  onGuardar: (datos: Elemento) => Promise<void>;
  onCancelar: () => void;
}

export function ElementoForm({ elementoInicial, onGuardar, onCancelar }: ElementoFormProps) {
  const [nombre, setNombre] = useState(elementoInicial?.nombre ?? '');
  const [frecuenciaRecambio, setFrecuenciaRecambio] = useState<number | ''>(elementoInicial?.frecuencia_recambio ?? '');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setEnviando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        frecuencia_recambio: frecuenciaRecambio === '' ? null : Number(frecuenciaRecambio),
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar los datos.');
    } finally {
      setEnviando(false);
    }
  };

  const esEdicion = Boolean(elementoInicial);

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion
          ? `Modificar Elemento: ${elementoInicial?.nombre}`
          : 'Registrar Nuevo Elemento'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <div className="row">
            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Nombre del elemento</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="Ej. Cepillo de cerdas suaves"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="col-md-6 mb-4">
              <Form.Label>Frecuencia de recambio (días)</Form.Label>
              <Form.Control
                type="number"
                min={1}
                placeholder="Opcional"
                value={frecuenciaRecambio}
                onChange={(e) => setFrecuenciaRecambio(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </Form.Group>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={enviando}>
              {enviando
                ? 'Guardando...'
                : esEdicion
                ? 'Actualizar Cambios'
                : 'Guardar'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}