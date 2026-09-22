import { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { Sector } from './types';

interface SectorFormProps {
  sectorInicial?: Sector | null;
  onGuardar: (datos: Sector) => Promise<void>;
  onCancelar: () => void;
}

export function SectorForm({ sectorInicial, onGuardar, onCancelar }: SectorFormProps) {
  const [nombre, setNombre] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (sectorInicial) {
      setNombre(sectorInicial.nombre);
    }
  }, [sectorInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setEnviando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar los datos.');
    } finally {
      setEnviando(false);
    }
  };

  const esEdicion = Boolean(sectorInicial);

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion
          ? `Modificar Sector: ${sectorInicial?.nombre}`
          : 'Registrar Nuevo Sector'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4">
            <Form.Label>Nombre del Sector</Form.Label>
            <Form.Control
              type="text"
              required
              placeholder="Ej. Planta de Producción"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Form.Group>

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