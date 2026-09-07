import { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { Profesor } from './types';

interface ProfesorFormProps {
  profesorInicial?: Profesor | null;
  onGuardar: (datos: Omit<Profesor, 'id'>) => Promise<void>;
  onCancelar: () => void;
}

export function ProfesorForm({ profesorInicial, onGuardar, onCancelar }: ProfesorFormProps) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [departamentoId, setDepartamentoId] = useState<number | ''>('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Precargar datos si estamos en modo edición
  useEffect(() => {
    if (profesorInicial) {
      setNombre(profesorInicial.nombre);
      setEmail(profesorInicial.email);
      setDepartamentoId(profesorInicial.departamento_id);
      setFechaIngreso(
        profesorInicial.fecha_ingreso ? profesorInicial.fecha_ingreso.split('T')[0] : ''
      );
    }
  }, [profesorInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (departamentoId === '') {
      alert('Debes indicar el número de departamento.');
      return;
    }

    setEnviando(true);
    try {
      await onGuardar({
        nombre,
        email,
        departamento_id: Number(departamentoId),
        fecha_ingreso: fechaIngreso ? new Date(fechaIngreso).toISOString() : undefined,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar los datos.');
    } finally {
      setEnviando(false);
    }
  };

  const esEdicion = Boolean(profesorInicial);

  return (
    <Card className="shadow-sm border-0">
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion ? `Modificar Profesor #${profesorInicial?.id}` : 'Registrar Nuevo Profesor'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Nombre y Apellido</Form.Label>
            <Form.Control
              type="text"
              required
              placeholder="Ej. Alan Turing"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Correo Electrónico</Form.Label>
            <Form.Control
              type="email"
              required
              placeholder="alan@unp.edu.ar"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>N° de Departamento</Form.Label>
            <Form.Control
              type="number"
              required
              min="1"
              value={departamentoId}
              onChange={(e) => setDepartamentoId(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <Form.Text className="text-muted">
              Debe coincidir con un ID de departamento existente en la base de datos.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Fecha de Ingreso</Form.Label>
            <Form.Control
              type="date"
              value={fechaIngreso}
              onChange={(e) => setFechaIngreso(e.target.value)}
            />
            {!esEdicion && (
              <Form.Text className="text-muted">
                Si se deja en blanco, el sistema asignará la fecha del día de hoy.
              </Form.Text>
            )}
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