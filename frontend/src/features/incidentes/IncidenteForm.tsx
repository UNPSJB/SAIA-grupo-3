import { useEffect, useState } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { API_BASE_URL } from '../../shared/libreria/api';
import { useAuth } from '../../shared/hooks/useAuth';
import type {
  Incidente,
  IncidenteCreateInput,
  IncidenteUpdateInput,
} from './types';

interface IncidenteFormProps {
  incidenteInicial?: Incidente | null;
  onGuardar: (
    datos: IncidenteCreateInput | IncidenteUpdateInput
  ) => Promise<void>;
  onCancelar: () => void;
}

export function IncidenteForm({
  incidenteInicial,
  onGuardar,
  onCancelar,
}: IncidenteFormProps) {
  const { currentUser } = useAuth();
  const [descripcion, setDescripcion] = useState('');
  const [reportanteDni, setReportanteDni] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [validated, setValidated] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const esEdicion = Boolean(incidenteInicial);

  useEffect(() => {
    if (incidenteInicial) {
      setDescripcion(incidenteInicial.descripcion);
      setReportanteDni(incidenteInicial.reportado_por_dni);
    } else {
      setDescripcion('');
      setReportanteDni(currentUser?.dni ?? '');
    }
    setFoto(null);
    setErrorEnvio(null);
    setValidated(false);
  }, [incidenteInicial, currentUser]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorEnvio(null);

    const form = e.currentTarget;

    if (!form.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setEnviando(true);

    try {
      await onGuardar({
        descripcion: descripcion.trim(),
        foto,
      });
    } catch (err: unknown) {
      setErrorEnvio(
        err instanceof Error ? err.message : 'Error al guardar los datos.'
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        {esEdicion
          ? `Modificar Incidente #${incidenteInicial?.id}`
          : 'Registrar Nuevo Incidente'}
      </Card.Header>

      <Card.Body className="p-4">
        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          {errorEnvio && <ErrorAlert mensaje={errorEnvio} />}

          <Form.Group className="mb-3">
            <Form.Label>Reportado por</Form.Label>
            <Form.Control
              type="text"
              value={
                incidenteInicial
                  ? `${incidenteInicial.reportado_por.apellido}, ${incidenteInicial.reportado_por.nombre} (DNI: ${reportanteDni})`
                  : currentUser
                    ? `${currentUser.apellido}, ${currentUser.nombre} (DNI: ${currentUser.dni})`
                    : 'Sin usuario'
              }
              disabled
            />
            <Form.Text className="text-muted">
              {esEdicion
                ? 'La persona que reportó y la fecha no se pueden modificar.'
                : 'El incidente se registra a nombre de tu usuario.'}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción del incidente</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              required
              maxLength={1000}
              placeholder="Describí brevemente qué ocurrió (rotura, hallazgo, devolución...)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">
              La descripción es obligatoria.
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Foto (opcional)</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFoto(e.target.files?.[0] ?? null)
              }
            />
            {esEdicion && incidenteInicial?.imagen_path && !foto && (
              <Form.Text className="text-muted">
                Foto actual:{' '}
                <a
                  href={`${API_BASE_URL}${incidenteInicial.imagen_path}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver foto actual
                </a>
                . Si elegís un archivo se reemplaza.
              </Form.Text>
            )}
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="secondary"
              onClick={onCancelar}
              disabled={enviando}
            >
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
