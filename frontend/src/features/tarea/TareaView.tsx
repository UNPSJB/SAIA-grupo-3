import { Card, Button, Badge } from 'react-bootstrap';
import type { Tarea } from './types';

interface TareaViewProps {
  tarea: Tarea;
  onEditar: () => void;
  onVolver: () => void;
}

export function TareaView({ tarea, onEditar, onVolver }: TareaViewProps) {
  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '800px' }}>
      <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-card-checklist fs-5"></i>
        <h5 className="mb-0">Detalle de Tarea</h5>
      </Card.Header>
      <Card.Body className="p-4">
        <div className="bg-light p-3 rounded border mb-4">
          <div className="row mb-2">
            <span className="col-sm-3 text-muted fw-semibold">Nombre:</span>
            <span className="col-sm-9 fw-bold">{tarea.nombre}</span>
          </div>
          <div className="row mb-2">
            <span className="col-sm-3 text-muted fw-semibold">Frecuencia:</span>
            <span className="col-sm-9 text-capitalize">{tarea.frecuencia}</span>
          </div>
          <div className="row">
            <span className="col-sm-3 text-muted fw-semibold">Equipo Asignado:</span>
            <span className="col-sm-9">{tarea.equipo ? `${tarea.equipo.nombre} (SN: ${tarea.equipo.numero_serie})` : 'Ninguno / General'}</span>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-6 mb-3 mb-md-0">
            <h6 className="fw-bold border-bottom pb-2">Elementos de Limpieza</h6>
            {tarea.elementos && tarea.elementos.length > 0 ? (
              <ul className="ps-3 mb-0">
                {tarea.elementos.map(e => <li key={e.id}>{e.nombre}</li>)}
              </ul>
            ) : (
              <span className="text-muted small">Sin elementos específicos.</span>
            )}
          </div>
          <div className="col-md-6">
            <h6 className="fw-bold border-bottom pb-2">Insumos Utilizados</h6>
            {tarea.insumos && tarea.insumos.length > 0 ? (
              <ul className="ps-3 mb-0">
                {tarea.insumos.map(i => <li key={i.id}>{i.nombre} <Badge bg="light" text="dark" className="border ms-1">{i.unidadMedidaObj?.sufijo}</Badge></li>)}
              </ul>
            ) : (
              <span className="text-muted small">Sin insumos específicos.</span>
            )}
          </div>
        </div>

        <div>
          <h6 className="fw-bold border-bottom pb-2">Procedimiento</h6>
          <p className="mb-0 bg-light p-3 rounded border" style={{ whiteSpace: 'pre-wrap' }}>
            {tarea.procedimiento}
          </p>
        </div>

      </Card.Body>
      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>Volver</Button>
        <Button variant="warning" onClick={onEditar}>Editar</Button>
      </Card.Footer>
    </Card>
  );
}