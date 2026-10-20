import { useEffect, useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { useAuth } from '../../shared/hooks/useAuth';
import { getAccionesCorrectivas } from './accionCorrectivaApi';
import type { AccionCorrectiva } from './accionCorrectivaTypes';
import { formatearFechaHora } from '../../shared/libreria/fechas';

interface AccionCorrectivaVigenteProps {
  incidenteId: number;
  onEditar: (accion: AccionCorrectiva) => void;
}

/** Recuadro que se muestra arriba del detalle de un incidente cerrado:
 *  qué se hizo para resolverlo, quién y cuándo. */
export function AccionCorrectivaVigente({ incidenteId, onEditar }: AccionCorrectivaVigenteProps) {
  const { currentUser } = useAuth();
  const [accion, setAccion] = useState<AccionCorrectiva | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAccionesCorrectivas(incidenteId)
      .then((acciones) => {
        if (!active) return;
        setAccion(acciones.find((a) => a.vigente) ?? null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active)
          setError(err instanceof Error ? err.message : 'Error al cargar la acción correctiva.');
      });
    return () => {
      active = false;
    };
  }, [incidenteId]);

  if (error) {
    return (
      <Alert variant="danger" className="mx-auto" style={{ maxWidth: '650px' }}>
        {error}
      </Alert>
    );
  }
  if (!accion) return null;

  return (
    <Alert variant="success" className="mx-auto shadow-sm" style={{ maxWidth: '650px' }}>
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div>
          <div className="fw-bold mb-1">
            <i className="bi bi-check-circle-fill me-2"></i>
            Incidente cerrado — Acción correctiva
          </div>
          <div className="text-break mb-2">{accion.descripcion}</div>
          <small>
            Resuelto por{' '}
            <strong>
              {accion.responsable.apellido}, {accion.responsable.nombre}
            </strong>{' '}
            el {formatearFechaHora(accion.fecha_cierre)}
          </small>
        </div>
        {currentUser?.administrar && (
          <Button
            variant="outline-success"
            size="sm"
            className="flex-shrink-0"
            title="Corregir la descripción"
            onClick={() => onEditar(accion)}
          >
            <i className="bi bi-pencil-fill"></i>
          </Button>
        )}
      </div>
    </Alert>
  );
}
