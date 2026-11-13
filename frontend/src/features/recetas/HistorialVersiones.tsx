import { Badge, Card, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useConsulta } from '../../shared/hooks/useConsulta';
import { formatearFechaHora } from '../../shared/libreria/fechas';
import { getVersiones } from './recetaApi';

interface HistorialVersionesProps {
  recetaId: number;
  versionActualId: number;
}

export function HistorialVersiones({ recetaId, versionActualId }: HistorialVersionesProps) {
  const versiones = useConsulta(() => getVersiones(recetaId), [recetaId]);

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="bg-body fw-semibold">
        <i className="bi bi-clock-history me-2" aria-hidden="true" />
        Historial de versiones
      </Card.Header>
      {versiones.error && (
        <Card.Body>
          <ErrorAlert mensaje={versiones.error} />
        </Card.Body>
      )}
      {!versiones.datos && !versiones.error && (
        <Card.Body>
          <LoadingSpinner mensaje="Cargando historial..." />
        </Card.Body>
      )}
      <ListGroup variant="flush">
        {versiones.datos?.map((version) => (
          <ListGroup.Item
            key={version.id}
            action
            as={Link}
            to={
              version.estado === 'vigente'
                ? `/recetas/${recetaId}`
                : `/recetas/${recetaId}/versiones/${version.id}`
            }
            active={version.id === versionActualId}
            className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-3"
          >
            <div>
              <div className="fw-semibold">Versión {version.numero}</div>
              <div className="small">
                {version.motivo} · {formatearFechaHora(version.fecha_creacion)} ·{' '}
                {version.creado_por.nombre} {version.creado_por.apellido}
              </div>
            </div>
            <Badge bg={version.estado === 'vigente' ? 'success' : 'secondary'}>
              {version.estado === 'vigente' ? 'Vigente' : 'Archivada · solo lectura'}
            </Badge>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
}
