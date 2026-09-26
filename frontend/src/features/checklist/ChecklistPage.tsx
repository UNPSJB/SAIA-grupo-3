import { useState, useEffect } from 'react';
import { Container, Card, Form } from 'react-bootstrap';
import { ChecklistView } from './ChecklistView';
import { getPersonal, type Personal, type TipoCapacidad } from '../personal';
import { ErrorAlert } from '../../shared/components/ErrorAlert';

const CAPACIDADES_OPERAR: TipoCapacidad[] = ['operar', 'operar_administrar'];

// TEMPORAL: mientras no exista el login, se elige a mano de qué personal ver el checklist.
// Con login, personalDni va a salir del usuario autenticado y este selector desaparece.
export function ChecklistPage() {
  const [operadores, setOperadores] = useState<Personal[]>([]);
  const [personalDni, setPersonalDni] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPersonal(1, 100)
      .then((res) => setOperadores(res.items.filter((p) => CAPACIDADES_OPERAR.includes(p.tipo_capacidad))))
      .catch(() => setError('Error al cargar el personal.'));
  }, []);

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Checklist del Día</h2>

      {error && <ErrorAlert mensaje={error} />}

      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <Form.Group>
            <Form.Label className="fw-semibold">Personal</Form.Label>
            <Form.Select
              value={personalDni ?? ''}
              onChange={(e) => setPersonalDni(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">Seleccione un operador...</option>
              {operadores.map((p) => (
                <option key={p.dni} value={p.dni}>{p.apellido}, {p.nombre} (DNI: {p.dni})</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Card.Body>
      </Card>

      {personalDni !== null && <ChecklistView key={personalDni} personalDni={personalDni} />}
    </Container>
  );
}
