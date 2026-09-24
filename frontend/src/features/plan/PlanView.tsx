import { useState } from 'react';
import { Card, Button, Badge, ListGroup, Modal } from 'react-bootstrap';
import type { Plan } from './types';
import type { Tarea } from '../tarea/types';
import { TareaView } from '../tarea/TareaView';

interface PlanViewProps {
  plan: Plan;
  onEditar: () => void;
  onVolver: () => void;
  onDesvincularTarea?: (tareaId: number) => Promise<void>;
}

export function PlanView({ plan, onEditar, onVolver, onDesvincularTarea }: PlanViewProps) {
  const [tareaVerDetalle, setTareaVerDetalle] = useState<Tarea | null>(null);

  return (
    <>
      <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '800px' }}>
        <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
          <i className="bi bi-calendar-check fs-5"></i>
          <h5 className="mb-0">Detalle del Plan</h5>
        </Card.Header>
        <Card.Body className="p-4">
          <div className="bg-light p-3 rounded border mb-4">
            <div className="row mb-2">
              <span className="col-sm-3 text-muted fw-semibold">Nombre:</span>
              <span className="col-sm-9 fw-bold">{plan.nombre}</span>
            </div>
            <div className="row mb-2">
              <span className="col-sm-3 text-muted fw-semibold">Descripción:</span>
              <span className="col-sm-9">{plan.descripcion}</span>
            </div>
            <div className="row mb-2">
              <span className="col-sm-3 text-muted fw-semibold">Estado:</span>
              <span className="col-sm-9">
                {plan.activo ? <Badge bg="success">Activo</Badge> : <Badge bg="danger">Inactivo</Badge>}
              </span>
            </div>
            <div className="row mb-2">
              <span className="col-sm-3 text-muted fw-semibold">Fechas:</span>
              <span className="col-sm-9">
                Inicio: {plan.fecha_inicio || 'N/A'} {plan.fecha_fin && ` | Fin: ${plan.fecha_fin}`}
              </span>
            </div>
          </div>

          <h6 className="fw-bold border-bottom pb-2">Destino y Responsabilidad</h6>
          <div className="row mb-4">
            <div className="col-md-4">
              <span className="text-muted small d-block">Responsable</span>
              <strong>{plan.responsable ? `${plan.responsable.apellido}, ${plan.responsable.nombre}` : `DNI: ${plan.responsable_id}`}</strong>
            </div>
            <div className="col-md-4">
              <span className="text-muted small d-block">Sector</span>
              <strong>{plan.sector ? plan.sector.nombre : 'General / Todos'}</strong>
            </div>
            <div className="col-md-4">
              <span className="text-muted small d-block">Equipo</span>
              <strong>{plan.equipo ? plan.equipo.nombre : 'No aplica'}</strong>
            </div>
          </div>

          <h6 className="fw-bold border-bottom pb-2">Tareas Asignadas</h6>
          {!plan.tareas || plan.tareas.length === 0 ? (
            <p className="text-muted small p-3 bg-light rounded text-center border">
              No hay tareas asignadas actualmente a este plan.
            </p>
          ) : (
            <ListGroup variant="flush" className="border rounded shadow-sm">
              {plan.tareas.map(t => (
                <ListGroup.Item key={t.id} className="d-flex justify-content-between align-items-center py-3">
                  <div>
                    <span className="fw-medium text-dark">{t.nombre}</span>
                    <Badge bg="info" className="text-dark text-capitalize ms-2">{t.frecuencia}</Badge>
                  </div>
                  <div className="d-flex gap-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      title="Ver en detalle"
                      onClick={() => setTareaVerDetalle(t)}
                    >
                      <i className="bi bi-eye"></i>
                    </Button>
                    {onDesvincularTarea && (
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        title="Desvincular del plan"
                        onClick={() => t.id && onDesvincularTarea(t.id)}
                      >
                        <i className="bi bi-x-circle"></i>
                      </Button>
                    )}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
        <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
          <Button variant="secondary" onClick={onVolver}>Volver</Button>
          <Button variant="warning" onClick={onEditar} className="text-white">Editar</Button>
        </Card.Footer>
      </Card>


      <Modal show={!!tareaVerDetalle} onHide={() => setTareaVerDetalle(null)} size="lg" centered>
        <Modal.Body className="p-0">
          {tareaVerDetalle && (
            <TareaView
              tarea={tareaVerDetalle}
              onEditar={() => {
                alert("Para editar esta tarea de forma permanente, por favor dirígete a la sección 'Tareas' en el menú principal.");
              }}
              onVolver={() => setTareaVerDetalle(null)}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}