import { Spinner } from 'react-bootstrap';

interface LoadingSpinnerProps {
  mensaje?: string;
}

export function LoadingSpinner({ mensaje = 'Cargando datos...' }: LoadingSpinnerProps) {
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 py-4 text-muted">
      <Spinner animation="border" variant="primary" size="sm" />
      <span>{mensaje}</span>
    </div>
  );
}