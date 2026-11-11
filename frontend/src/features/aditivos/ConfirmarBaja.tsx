import { useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';

interface ConfirmarBajaProps {
  titulo: string;
  descripcion: string;
  onConfirmar: () => Promise<void>;
  onCancelar: () => void;
}

export function ConfirmarBaja({
  titulo,
  descripcion,
  onConfirmar,
  onCancelar,
}: ConfirmarBajaProps) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await onConfirmar();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo dar de baja.');
      setEnviando(false);
    }
  };

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '560px' }}>
      <Card.Header as="h5" className="bg-body-tertiary text-secondary py-3">
        {titulo}
      </Card.Header>
      <Card.Body className="p-4">
        {error && <Alert variant="danger">{error}</Alert>}
        <p>{descripcion}</p>
        <p className="small text-body-secondary">
          Queda guardado para el historial y se puede reactivar desde el listado.
        </p>
        <div className="d-flex justify-content-end gap-2">
          <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmar} disabled={enviando}>
            {enviando ? 'Dando de baja...' : 'Dar de baja'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
