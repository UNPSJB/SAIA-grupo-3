import { useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Incidente } from './types';
import type { ReaperturaInput } from './accionCorrectivaTypes';

interface ReabrirIncidenteFormProps {
  incidente: Incidente;
  onConfirmar: (datos: ReaperturaInput) => Promise<void>;
  onCancelar: () => void;
}

export function ReabrirIncidenteForm({
  incidente,
  onConfirmar,
  onCancelar,
}: ReabrirIncidenteFormProps) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [validated, setValidated] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorEnvio(null);

    const form = e.currentTarget;
    if (!form.checkValidity() || !motivo.trim()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setEnviando(true);
    try {
      await onConfirmar({ motivo: motivo.trim() });
    } catch (err: unknown) {
      setErrorEnvio(err instanceof Error ? err.message : 'Error al reabrir el incidente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Form noValidate validated={validated} onSubmit={handleSubmit}>
      {errorEnvio && <ErrorAlert mensaje={errorEnvio} />}

      <div className="bg-light p-3 rounded border mb-3 small">
        <div className="text-muted fw-semibold mb-1">Incidente</div>
        <div className="text-break">{incidente.descripcion}</div>
      </div>

      <Form.Group className="mb-3">
        <Form.Label>Motivo de la reapertura</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          required
          maxLength={1000}
          placeholder="¿Por qué se vuelve a abrir? (el problema persiste, la acción no alcanzó...)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <Form.Control.Feedback type="invalid">
          El motivo es obligatorio para dejar registro del cambio.
        </Form.Control.Feedback>
      </Form.Group>

      <Alert variant="warning" className="small py-2">
        <i className="bi bi-info-circle me-1"></i>
        El incidente vuelve a <strong>Abierto</strong>. La acción correctiva anterior queda guardada
        en el historial.
      </Alert>

      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="warning" type="submit" disabled={enviando}>
          {enviando ? 'Reabriendo...' : 'Reabrir incidente'}
        </Button>
      </div>
    </Form>
  );
}
