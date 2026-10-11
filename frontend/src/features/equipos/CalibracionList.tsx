import { Badge, Button, Card, Table } from 'react-bootstrap';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { API_BASE_URL } from '../../shared/libreria/api';
import { useAuth } from '../../shared/hooks/useAuth';
import type { Calibracion } from './types';
import { esCertificadoPdf } from './types';

interface CalibracionListProps {
  calibraciones: Calibracion[];
  loading: boolean;
  error: string | null;
  formatearFecha: (fecha: string | null) => string;
  onNuevoClick: () => void;
  onEditarClick: (calibracion: Calibracion) => void;
  onEliminarClick: (calibracion: Calibracion) => void;
}

function estaVencida(fecha: string | null): boolean {
  if (!fecha) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return new Date(`${fecha}T00:00:00`) < hoy;
}

export function CalibracionList({
  calibraciones,
  loading,
  error,
  formatearFecha,
  onNuevoClick,
  onEditarClick,
  onEliminarClick,
}: CalibracionListProps) {
  const { currentUser } = useAuth();

  if (loading) {
    return <LoadingSpinner mensaje="Cargando calibraciones..." />;
  }

  if (error) {
    return <ErrorAlert mensaje={error} />;
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 mt-4">
        <h4 className="mb-0 text-secondary">Historial de Calibraciones</h4>

        {currentUser?.administrar && (
          <Button
            variant="success"
            size="sm"
            onClick={onNuevoClick}
            className="d-flex align-items-center gap-1 shadow-sm"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Registrar Calibración</span>
          </Button>
        )}
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Fecha</th>
                <th>Otorgado por</th>
                <th>Vencimiento</th>
                <th>Evidencia</th>
                {currentUser?.administrar && (
                  <th className="text-center" style={{ width: '120px' }}>
                    Acciones
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {calibraciones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    Este equipo aún no tiene calibraciones registradas.
                  </td>
                </tr>
              ) : (
                calibraciones.map((calibracion, indice) => {
                  const vencida = estaVencida(calibracion.fecha_vencimiento_calculada);
                  const esPdf = esCertificadoPdf(calibracion.certificado_path);
                  return (
                    <tr key={calibracion.id}>
                      <td>
                        {formatearFecha(calibracion.fecha_calibracion)}
                        {indice === 0 && (
                          <Badge bg="info" className="ms-2">Última</Badge>
                        )}
                      </td>
                      <td className="text-break">{calibracion.otorgado_por}</td>
                      <td>
                        {calibracion.fecha_vencimiento_calculada ? (
                          <Badge bg={vencida ? 'danger' : 'success'}>
                            {formatearFecha(calibracion.fecha_vencimiento_calculada)}
                            {vencida && ' (Vencida)'}
                          </Badge>
                        ) : (
                          <span className="text-muted fst-italic small">Sin periodicidad</span>
                        )}
                      </td>
                      <td>
                        <a
                          href={`${API_BASE_URL}${calibracion.certificado_path}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <i className={`bi ${esPdf ? 'bi-file-earmark-pdf' : 'bi-image'} me-1`}></i>
                          {esPdf ? 'Ver PDF' : 'Ver foto'}
                        </a>
                      </td>
                      {currentUser?.administrar && (
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-2">
                            <Button
                              variant="warning"
                              size="sm"
                              className="text-white py-1 px-2 shadow-sm"
                              title="Modificar"
                              aria-label={`Modificar calibración del ${formatearFecha(calibracion.fecha_calibracion)}`}
                              onClick={() => onEditarClick(calibracion)}
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="py-1 px-2 shadow-sm"
                              title="Eliminar"
                              aria-label={`Eliminar calibración del ${formatearFecha(calibracion.fecha_calibracion)}`}
                              onClick={() => onEliminarClick(calibracion)}
                            >
                              <i className="bi bi-trash3-fill"></i>
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </>
  );
}
