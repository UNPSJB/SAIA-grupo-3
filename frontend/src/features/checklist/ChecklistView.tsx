import { Table, Card, Button, Badge, ProgressBar } from 'react-bootstrap';
import { useChecklist } from './useChecklist';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { ItemChecklist } from './types';

interface ChecklistViewProps {
  personalDni: number;
}

// Las fechas llegan como 'AAAA-MM-DD'. Se formatean a mano porque new Date()
// las interpreta en UTC y en Argentina mostraría el día anterior.
function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

function textoPeriodo(item: ItemChecklist): string {
  if (item.frecuencia === 'diaria') return 'Hoy';
  return `${formatearFecha(item.periodo_inicio)} al ${formatearFecha(item.periodo_fin)}`;
}

export function ChecklistView({ personalDni }: ChecklistViewProps) {
  const { checklist, loading, error, recargar } = useChecklist(personalDni);

  // El spinner solo se muestra en la primera carga, para que no parpadee al recargar.
  if (loading && !checklist) return <LoadingSpinner mensaje="Cargando checklist..." />;
  if (error) return <ErrorAlert mensaje={error} />;
  if (!checklist) return null;

  const porcentaje = checklist.total > 0 ? Math.round((checklist.realizadas / checklist.total) * 100) : 0;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0 text-secondary">
            {checklist.responsable.apellido}, {checklist.responsable.nombre}
          </h4>
          <small className="text-muted">Checklist del {formatearFecha(checklist.fecha)}</small>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={recargar} disabled={loading} className="d-flex align-items-center gap-1 shadow-sm">
          <i className="bi bi-arrow-clockwise"></i><span>Actualizar</span>
        </Button>
      </div>

      {checklist.total > 0 && (
        <div className="mb-3">
          <div className="d-flex justify-content-between small text-muted mb-1">
            <span>{checklist.realizadas} de {checklist.total} tareas realizadas</span>
            <span>{checklist.pendientes} pendientes</span>
          </div>
          <ProgressBar now={porcentaje} label={`${porcentaje}%`} variant="success" />
        </div>
      )}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Tarea</th>
                <th>Plan</th>
                <th>Frecuencia</th>
                <th>Período</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {checklist.items.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4 text-muted">No hay tareas asignadas para hoy.</td></tr>
              ) : (
                checklist.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.tarea.nombre}</strong>
                      <small className="d-block text-muted text-truncate" style={{ maxWidth: '300px' }} title={item.tarea.procedimiento}>
                        {item.tarea.procedimiento}
                      </small>
                    </td>
                    <td>{item.plan.nombre}</td>
                    <td><Badge bg="info" className="text-dark text-capitalize">{item.frecuencia}</Badge></td>
                    <td><small className="text-muted">{textoPeriodo(item)}</small></td>
                    <td>
                      {item.estado === 'realizada' ? (
                        <Badge bg="success">Realizada</Badge>
                      ) : (
                        <Badge bg="warning" className="text-dark">Pendiente</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </>
  );
}
