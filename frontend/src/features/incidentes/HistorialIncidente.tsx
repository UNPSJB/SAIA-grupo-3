import { useCallback, useEffect, useState } from 'react';
import { Badge } from 'react-bootstrap';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { getHistorialIncidente } from './historialApi';
import type { AccionMovimientoIncidente, MovimientoIncidente } from './historialTypes';
import { ACCIONES_MOVIMIENTO_INCIDENTE } from './historialTypes';

interface HistorialIncidenteProps {
  incidenteId: number;
}

export function HistorialIncidente({ incidenteId }: HistorialIncidenteProps) {
  const [movimientos, setMovimientos] = useState<MovimientoIncidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setMovimientos(await getHistorialIncidente(incidenteId));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar el historial.');
    } finally {
      setLoading(false);
    }
  }, [incidenteId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const getAccion = (valor: AccionMovimientoIncidente) =>
    ACCIONES_MOVIMIENTO_INCIDENTE.find((a) => a.value === valor) ?? {
      label: valor,
      variante: 'secondary',
      icono: 'bi-circle',
      etiquetaMotivo: 'Detalle',
    };

  return (
    <div className="mt-4">
      <h6 className="text-secondary fw-bold border-bottom pb-2 mb-3">
        <i className="bi bi-clock-history me-2"></i>
        Historial
      </h6>

      {loading ? (
        <LoadingSpinner mensaje="Cargando historial..." />
      ) : error ? (
        <ErrorAlert mensaje={error} />
      ) : movimientos.length === 0 ? (
        <p className="text-muted small mb-0">
          Este incidente no tiene movimientos registrados.
        </p>
      ) : (
        <ul className="list-unstyled mb-0">
          {movimientos.map((movimiento, indice) => {
            const info = getAccion(movimiento.accion);
            const esUltimo = indice === movimientos.length - 1;
            return (
              <li key={movimiento.id} className="d-flex gap-3">
                <div className="d-flex flex-column align-items-center">
                  <i className={`bi ${info.icono} text-${info.variante} fs-5`}></i>
                  {!esUltimo && (
                    <div className="flex-grow-1 border-start border-2 my-1"></div>
                  )}
                </div>
                <div className={esUltimo ? '' : 'pb-3'}>
                  <div>
                    <Badge
                      bg={info.variante}
                      className={movimiento.accion === 'reabierto' ? 'text-dark' : ''}
                    >
                      {info.label}
                    </Badge>{' '}
                    <small className="text-muted">
                      {new Date(movimiento.fecha_hora).toLocaleString()}
                    </small>
                  </div>
                  <div className="small">
                    por <strong>{movimiento.personal.apellido}, {movimiento.personal.nombre}</strong>
                  </div>
                  {movimiento.motivo && (
                    <div className="small text-break mt-1">
                      <span className="text-muted">{info.etiquetaMotivo}:</span>{' '}
                      {movimiento.motivo}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}