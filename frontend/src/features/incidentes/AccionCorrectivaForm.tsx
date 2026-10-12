import { useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { useAuth } from '../../shared/hooks/useAuth';
import type { Incidente } from './types';
import type { AccionCorrectiva, AccionCorrectivaInput } from './accionCorrectivaTypes';

interface AccionCorrectivaFormProps {
  incidente: Incidente;
  accionInicial?: AccionCorrectiva | null;
  onGuardar: (datos: AccionCorrectivaInput) => Promise<void>;
  onCancelar: () => void;
}

export function AccionCorrectivaForm({
  incidente,
  accionInicial,
  onGuardar,
  onCancelar,
}: AccionCorrectivaFormProps) {
  const { currentUser } = useAuth();
  const [descripcion, setDescripcion] = useState(accionInicial?.descripcion ?? '');
  const [enviando, setEnviando] = useState(false);
  const [validated, setValidated] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const esEdicion = Boolean(accionInicial);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorEnvio(null);

    const form = e.currentTarget;
    if (!form.checkValidity() || !descripcion.trim()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setEnviando(true);
    try {
      await onGuardar({ descripcion: descripcion.trim() });
    } catch (err: unknown) {
      setErrorEnvio(err instanceof Error ? err.message : 'Error al guardar los datos.');
    } finally {
      setEnviando(false);
    }
  };

  // Responsable y fecha los pone el backend: acá solo se muestran
  const responsable = accionInicial
    ? `${accionInicial.responsable.apellido}, ${accionInicial.responsable.nombre}`
    : currentUser
      ? `${currentUser.apellido}, ${currentUser.nombre}`
      : 'Sin usuario';
  const fecha = accionInicial
    ? new Date(accionInicial.fecha_cierre).toLocaleString()
    : 'Se registra al guardar';

  return (
    <Form noValidate validated={validated} onSubmit={handleSubmit}>
      {errorEnvio && <ErrorAlert mensaje={errorEnvio} />}

      <div className="bg-light p-3 rounded border mb-3 small">
        <div className="text-muted fw-semibold mb-1">Incidente</div>
        <div className="text-break">{incidente.descripcion}</div>
      </div>

      <Form.Group className="mb-3">
        <Form.Label>Acción correctiva tomada</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          required
          maxLength={1000}
          placeholder="Describí qué se hizo para resolver el problema"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <Form.Control.Feedback type="invalid">
          La descripción de la acción correctiva es obligatoria.
        </Form.Control.Feedback>
      </Form.Group>

      <div className="row mb-3">
        <Form.Group className="col-6">
          <Form.Label>Responsable</Form.Label>
          <Form.Control type="text" value={responsable} disabled />
        </Form.Group>
        <Form.Group className="col-6">
          <Form.Label>Fecha de cierre</Form.Label>
          <Form.Control type="text" value={fecha} disabled />
        </Form.Group>
      </div>

      {!esEdicion && (
        <Alert variant="info" className="small py-2">
          <i className="bi bi-info-circle me-1"></i>
          Al guardar, el incidente pasa a estado <strong>Cerrado</strong>.
        </Alert>
      )}

      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant={esEdicion ? 'primary' : 'success'} type="submit" disabled={enviando}>
          {enviando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Registrar y cerrar'}
        </Button>
      </div>
    </Form>
  );
}
