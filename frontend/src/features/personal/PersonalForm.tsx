import { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import type { Personal, TipoCapacidad } from './types';
import { TIPOS_CAPACIDAD } from './types';

interface PersonalFormProps {
  personalInicial?: Personal | null;
  onGuardar: (datos: Personal) => Promise<void>;
  onCancelar: () => void;
}

export function PersonalForm({ personalInicial, onGuardar, onCancelar }: PersonalFormProps) {
  const [dni, setDni] = useState<number | ''>('');
  const [nroLegajo, setNroLegajo] = useState<number | ''>('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [tipoCapacidad, setTipoCapacidad] = useState<TipoCapacidad>('operar');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (personalInicial) {
      setDni(personalInicial.dni);
      setNroLegajo(personalInicial.nroLegajo);
      setNombre(personalInicial.nombre);
      setApellido(personalInicial.apellido);
      setEmail(personalInicial.email);
      setTipoCapacidad(personalInicial.tipo_capacidad);
    }
  }, [personalInicial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dni === '' || nroLegajo === '') return;

    setEnviando(true);
    try {
      await onGuardar({ 
        dni: Number(dni), 
        nroLegajo: Number(nroLegajo), 
        nombre, 
        apellido, 
        email, 
        tipo_capacidad: tipoCapacidad 
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar los datos.');
    } finally {
      setEnviando(false);
    }
  };

  const esEdicion = Boolean(personalInicial);

  return (
    <Card className="shadow-sm border-0">
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion ? `Modificar Personal: ${apellido}, ${nombre}` : 'Registrar Nuevo Personal'}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <div className="row">
            <Form.Group className="col-md-6 mb-3">
              <Form.Label>DNI</Form.Label>
              <Form.Control type="number" required disabled={esEdicion} value={dni} onChange={(e) => setDni(e.target.value === '' ? '' : Number(e.target.value))} />
              {esEdicion && <Form.Text className="text-muted">El DNI no puede modificarse.</Form.Text>}
            </Form.Group>
            <Form.Group className="col-md-6 mb-3">
              <Form.Label>N° de Legajo</Form.Label>
              <Form.Control type="number" required value={nroLegajo} onChange={(e) => setNroLegajo(e.target.value === '' ? '' : Number(e.target.value))} />
            </Form.Group>
          </div>
          
          <div className="row">
            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Form.Group>
            <Form.Group className="col-md-6 mb-3">
              <Form.Label>Apellido</Form.Label>
              <Form.Control type="text" required value={apellido} onChange={(e) => setApellido(e.target.value)} />
            </Form.Group>
          </div>

          <div className="row">
            <Form.Group className="col-md-6 mb-4">
              <Form.Label>Correo Electrónico</Form.Label>
              <Form.Control type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Form.Group>
            
            <Form.Group className="col-md-6 mb-4">
              <Form.Label>Capacidad en el Sistema</Form.Label>
              <Form.Select 
                required 
                value={tipoCapacidad} 
                onChange={(e) => setTipoCapacidad(e.target.value as TipoCapacidad)}
              >
                {TIPOS_CAPACIDAD.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>

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