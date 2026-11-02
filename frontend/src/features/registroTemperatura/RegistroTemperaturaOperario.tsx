import { useState } from 'react';
import { Card, Form, Button, Spinner, Alert  } from 'react-bootstrap';
import { getEquiposPendientesHoy, registrarTemperatura } from './registroTemperaturaApi';
import type { Equipo } from '../equipos/types';
import { useAuth } from '../../shared/hooks/useAuth';
import { useConsulta } from '../abastecimiento/useConsulta';

export function RegistroTemperaturaOperario() {
  const { currentUser } = useAuth();
  const consulta = useConsulta(getEquiposPendientesHoy);
  const equipos = consulta.datos ?? [];
  const cargando = consulta.cargando;
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<Equipo | null>(null);
  const [temperatura, setTemperatura] = useState<string>('');
  const [accionTomada, setAccionTomada] = useState('');
  const [fueraDeRango, setFueraDeRango] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);

  const cargarEquipos = consulta.recargar;

  const handleSeleccionEquipo = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eq = equipos.find((eq) => eq.id === Number(e.target.value)) || null;
    setEquipoSeleccionado(eq);
    setTemperatura('');
    setAccionTomada('');
    setFueraDeRango(false);
    setExito(null);
  };

  const handleTemperaturaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTemperatura(val);
    setExito(null);

    if (equipoSeleccionado && val !== '') {
      const numVal = Number(val);
      const min = Number(equipoSeleccionado.temperatura_minima);
      const max = Number(equipoSeleccionado.temperatura_maxima);
      setFueraDeRango(numVal < min || numVal > max);
    } else {
      setFueraDeRango(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipoSeleccionado || !currentUser?.id) return;

    if (fueraDeRango && !accionTomada.trim()) {
      alert('Debe ingresar la acción tomada ya que la temperatura está fuera de rango.');
      return;
    }

    setEnviando(true);
    try {
     await registrarTemperatura({
            equipo_id: equipoSeleccionado.id!,
            temperatura_registrada: Number(temperatura),
            accion_tomada: fueraDeRango ? accionTomada : undefined,
          });

      setExito(`Lectura guardada para ${equipoSeleccionado.nombre}`);
      setEquipoSeleccionado(null);
      setTemperatura('');
      setAccionTomada('');
      setFueraDeRango(false);
      cargarEquipos();
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Hubo un error al registrar la temperatura.');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <div className="p-4 text-center"><Spinner animation="border" /></div>;
  if (consulta.error) return <Alert variant="danger">{consulta.error} <Button variant="outline-danger" onClick={cargarEquipos}>Reintentar</Button></Alert>;

 if (equipos.length === 0) {
    return (
      <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '600px' }}>
        <Card.Body className="p-5 text-center text-success">
          {exito && (
            <div className="bg-success-subtle text-success border border-success border-opacity-25 rounded p-3 mb-4 d-flex align-items-center justify-content-center gap-2 text-start">
              <i className="bi bi-check-circle-fill"></i>
              <span className="fw-medium">{exito}</span>
            </div>
          )}
          <h4 className="fw-bold mb-3">¡Todo al día!</h4>
          <p className="mb-0">Ya se controló la temperatura de todos los equipos de frío en este turno.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 mx-auto bg-body" style={{ maxWidth: '600px' }}>
      <Card.Body className="p-4">
        <h5 className="fw-bold mb-4">Registro Diario de Temperatura</h5>

      {exito && (
          <div className="bg-success-subtle text-success border border-success border-opacity-25 rounded p-3 mb-4 d-flex align-items-center gap-2">
             <i className="bi bi-check-circle-fill"></i>
             <span className="fw-medium">{exito}</span>
          </div>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4">
            <Form.Label className="text-body-secondary small mb-1">Equipo Pendiente</Form.Label>
            <Form.Select
              value={equipoSeleccionado?.id || ''}
              onChange={handleSeleccionEquipo}
              required
              className="bg-body-tertiary"
            >
              <option value="">Elegí un equipo de la lista...</option>
              {equipos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre} (Serie: {eq.numero_serie})
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {equipoSeleccionado && (
            <div className="bg-body-tertiary p-3 rounded border border-secondary-subtle mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-body-secondary small">Rango Permitido:</span>
                <span className="badge bg-info text-dark">
                  {equipoSeleccionado.temperatura_minima}°C a {equipoSeleccionado.temperatura_maxima}°C
                </span>
              </div>

              <Form.Group className="mb-0">
                <Form.Label className="text-body-secondary small mb-1">Temperatura Actual (°C)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  value={temperatura}
                  onChange={handleTemperaturaChange}
                  required
                  className={fueraDeRango ? 'border-danger text-danger' : ''}
                />
              </Form.Group>
            </div>
          )}

        {fueraDeRango && (
            <Alert variant="danger" className="mb-4 shadow-sm border-danger">
              <Alert.Heading className="fs-6 fw-bold mb-2">
              ¡Temperatura Fuera de Rango!
              </Alert.Heading>
              <p className="small mb-3">
                El valor ingresado supera los límites permitidos. Es obligatorio registrar qué acción correctiva aplicaste.
              </p>
              <Form.Group controlId="accion_tomada">
                <Form.Label className="fw-semibold small">Acción Tomada</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Ej. Se cerró la puerta de la cámara / Se avisó a mantenimiento..."
                  value={accionTomada}
                  onChange={(e) => setAccionTomada(e.target.value)}
                  required
                />
              </Form.Group>
            </Alert>
          )}
          <div className="d-flex justify-content-end mt-4">
            <Button
              variant="primary"
              type="submit"
              disabled={!equipoSeleccionado || !temperatura || enviando}
            >
              {enviando ? 'Registrando...' : 'Registrar Lectura'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
