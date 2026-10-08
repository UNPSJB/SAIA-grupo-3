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

  const formatFecha = (fechaStr?: string | null) => {
    if (!fechaStr) return 'No registrada';
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  };

  let fechaVencimiento: Date | null = null;
  let estaVencido = false;

  if (equipo.fecha_ultima_calibracion && equipo.periodicidad_dias) {
    const lastCal = new Date(`${equipo.fecha_ultima_calibracion}T00:00:00`);
    fechaVencimiento = new Date(lastCal);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + equipo.periodicidad_dias);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    estaVencido = fechaVencimiento < hoy;
  }

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-tools fs-5 flex-shrink-0"></i>
        <h5 className="mb-0">Detalle del Equipo</h5>
      </Card.Header>
      
      <Card.Body className="p-4">
        <div className="bg-light p-3 rounded border mb-3">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">N° de Serie:</span>
            <span className="col-8 fw-bold font-monospace">{equipo.numero_serie}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Nombre:</span>
            <span className="col-8">{equipo.nombre}</span>
          </div>
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">Tipo:</span>
            <span className="col-8">
              <Badge
                bg={getBadgeVariant(equipo.tipo)}
                className={equipo.tipo === 'herramienta' ? 'text-dark' : ''}
              >
                {etiquetaTipo}
              </Badge>
            </span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Sector Asignado:</span>
            <span className="col-8">
              {equipo.sector ? (
                <span className="fw-medium text-dark">{equipo.sector.nombre}</span>
              ) : (
                <span className="text-muted">Sector #{equipo.sector_id}</span>
              )}
            </span>
          </div>
        </div>
        <div className={`bg-white p-3 rounded border ${estaVencido ? 'border-danger-subtle' : 'border-secondary-subtle'}`}>
          <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
            <h6 className="text-secondary fw-bold mb-0">
              Calibración y Mantenimiento
            </h6>
          </div>

          <div className="row mb-2">
            <span className="col-5 text-muted fw-semibold">Última Calibración:</span>
            <span className="col-7">{formatFecha(equipo.fecha_ultima_calibracion)}</span>
          </div>
          <div className="row mb-2">
            <span className="col-5 text-muted fw-semibold">Periodicidad:</span>
            <span className="col-7">
              {equipo.periodicidad_dias ? `${equipo.periodicidad_dias} días` : 'No definida'}
            </span>
          </div>
          <div className="row mt-3 pt-2 border-top">
            <span className="col-5 text-muted fw-semibold">Próximo Vencimiento:</span>
            <span className="col-7">
              {fechaVencimiento ? (
                <Badge bg={estaVencido ? 'danger' : 'success'} className="fs-6 fw-medium">
                  {formatFecha(fechaVencimiento.toISOString().split('T')[0])}
                  {estaVencido && ' (Vencido)'}
                </Badge>
              ) : (
                <span className="text-muted fst-italic">Faltan datos para calcular</span>
              )}
            </span>
          </div>
        </div>

      </Card.Body>

      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>
          Volver
        </Button>
        <Button variant="warning" onClick={onEditar} className="text-dark fw-medium">
          Editar Datos
        </Button>
      </Card.Footer>
    </Card>
  );
}