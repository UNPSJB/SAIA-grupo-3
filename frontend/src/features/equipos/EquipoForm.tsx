import { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { Equipo, TipoEquipo } from './types';
import { TIPOS_EQUIPOS } from './types';

interface EquipoFormProps {
  equipoInicial?: Equipo | null;
  onGuardar: (datos: Equipo) => Promise<void>;
  onCancelar: () => void;
}

export function EquipoForm({ equipoInicial, onGuardar, onCancelar }: EquipoFormProps) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoEquipo>('equipo');
  const [ubicacion, setUbicacion] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (equipoInicial) {
      setNombre(equipoInicial.nombre);
      setTipo(equipoInicial.tipo);
      setUbicacion(equipoInicial.ubicacion);
    }
  }, [equipoInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !ubicacion.trim()) return;

    setEnviando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        tipo,
        ubicacion: ubicacion.trim(),
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar los datos.');
    } finally {
      setEnviando(false);
    }
  };

  const esEdicion = Boolean(equipoInicial);

  return (
    <Card className="shadow-sm border-0">
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion ? `Modificar Equipo #${equipoInicial?.id}: ${nombre}` : 'Registrar Nuevo Equipo'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <div className="row">
            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Nombre del Equipo</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="Ej. Balanza de precisión"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Tipo de Equipo</Form.Label>
              <Form.Select
                required
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoEquipo)}
              >
                {TIPOS_EQUIPOS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>

          <div className="row">
            <Form.Group className="col-12 mb-4">
              <Form.Label>Ubicación</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="Ej. Laboratorio central / Sector 2"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
              />
            </Form.Group>
          </div>

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