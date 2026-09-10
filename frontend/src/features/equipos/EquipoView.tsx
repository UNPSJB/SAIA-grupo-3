import { Card, Button, Badge } from 'react-bootstrap';
import { TIPOS_EQUIPOS } from './types';
import type { Equipo, TipoEquipo } from './types';

interface EquipoViewProps {
  equipo: Equipo;
  onEditar: () => void;
  onVolver: () => void;
}

export function EquipoView({ equipo, onEditar, onVolver }: EquipoViewProps) {
  const etiquetaTipo =
    TIPOS_EQUIPOS.find((t) => t.value === equipo.tipo)?.label ?? equipo.tipo;

  const getBadgeVariant = (valor: TipoEquipo) => {
    switch (valor) {
      case 'equipo':
        return 'primary';
      case 'herramienta':
        return 'warning';
      case 'instrumento':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-tools fs-5"></i>
        <h5 className="mb-0">Detalle del Equipo</h5>
      </Card.Header>
      <Card.Body className="p-4">
        <div className="bg-light p-3 rounded border mb-2">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">ID:</span>
            <span className="col-8 fw-bold">#{equipo.id}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Nombre:</span>
            <span className="col-8">{equipo.nombre}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Tipo:</span>
            <span className="col-8">
              <Badge bg={getBadgeVariant(equipo.tipo)} className={equipo.tipo === 'herramienta' ? 'text-dark' : ''}>
                {etiquetaTipo}
              </Badge>
            </span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Ubicación:</span>
            <span className="col-8">{equipo.ubicacion}</span>
          </div>
        </div>
      </Card.Body>
      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>
          Volver
        </Button>
        <Button variant="warning" onClick={onEditar}>
          Editar
        </Button>
      </Card.Footer>
    </Card>
  );
}