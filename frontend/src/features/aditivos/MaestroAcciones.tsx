import { Button } from 'react-bootstrap';

interface MaestroAccionesProps {
  activo: boolean;
  onModificar: () => void;
  onBaja: () => void;
  onReactivar: () => void;
}

export function MaestroAcciones({
  activo,
  onModificar,
  onBaja,
  onReactivar,
}: MaestroAccionesProps) {
  if (!activo) {
    return (
      <Button size="sm" variant="success" onClick={onReactivar}>
        <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />
        Reactivar
      </Button>
    );
  }
  return (
    <div className="d-flex justify-content-center gap-2">
      <Button
        size="sm"
        variant="warning"
        className="text-white py-1 px-2 shadow-sm"
        title="Modificar"
        aria-label="Modificar"
        onClick={onModificar}
      >
        <i className="bi bi-pencil-fill" aria-hidden="true" />
      </Button>
      <Button
        size="sm"
        variant="danger"
        className="py-1 px-2 shadow-sm"
        title="Dar de baja"
        aria-label="Dar de baja"
        onClick={onBaja}
      >
        <i className="bi bi-trash3-fill" aria-hidden="true" />
      </Button>
    </div>
  );
}
