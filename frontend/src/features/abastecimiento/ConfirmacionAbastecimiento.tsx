import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';

interface Props {
  titulo: string;
  descripcion: string;
  confirmar: string;
  reactivar?: boolean;
  children: ReactNode;
  onConfirmar: () => Promise<void>;
  onCancelar: () => void;
}

export function ConfirmacionAbastecimiento({
  titulo,
  descripcion,
  confirmar,
  reactivar = false,
  children,
  onConfirmar,
  onCancelar,
}: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const variante = reactivar ? 'success' : 'danger';
  async function enviar() {
    setOcupado(true);
    setError('');
    try {
      await onConfirmar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la operación.');
      setOcupado(false);
    }
  }
  return (
    <Card className={`border-${variante} shadow-sm mx-auto`} style={{ maxWidth: '650px' }}>
      <Card.Header className={`bg-${variante} text-white d-flex align-items-center gap-2 py-3`}>
        <i
          className={`bi ${reactivar ? 'bi-arrow-counterclockwise' : 'bi-exclamation-triangle-fill'} fs-5`}
          aria-hidden="true"
        />
        <h5 className="mb-0">{titulo}</h5>
      </Card.Header>
      <Card.Body className="p-4">
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <p className="text-body-secondary">{descripcion}</p>
        <div className="bg-body-tertiary p-3 rounded border">{children}</div>
      </Card.Body>
      <Card.Footer className="bg-body border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onCancelar} disabled={ocupado}>
          Cancelar
        </Button>
        <Button variant={variante} onClick={() => void enviar()} disabled={ocupado}>
          {ocupado ? 'Procesando...' : confirmar}
        </Button>
      </Card.Footer>
    </Card>
  );
}
