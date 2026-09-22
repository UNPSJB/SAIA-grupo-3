import { Card, Button, Badge ,ListGroup } from 'react-bootstrap';
import type { Sector } from './types';


interface SectorViewProps {
  sector: Sector;
  onEditar: () => void;
  onVolver: () => void;
}

export function SectorView({ sector, onEditar, onVolver }: SectorViewProps) {
  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '650px' }}>
      <Card.Header className="bg-light text-secondary d-flex align-items-center gap-2 py-3">
        <i className="bi bi-building fs-5"></i>
        <h5 className="mb-0">Detalle del Sector</h5>
      </Card.Header>
      <Card.Body className="p-4">
        {/* DATOS DEL SECTOR */}
        <div className="bg-light p-3 rounded border mb-4">
          <div className="row mb-2">
            <span className="col-4 text-muted fw-semibold">ID de Sector:</span>
            <span className="col-8 fw-bold font-monospace">#{sector.id}</span>
          </div>
          <div className="row">
            <span className="col-4 text-muted fw-semibold">Nombre:</span>
            <span className="col-8">{sector.nombre}</span>
          </div>
        </div>

        {/* LISTA DE EQUIPOS ASIGNADOS */}
        <h6 className="text-secondary fw-semibold mb-3 border-bottom pb-2">
          Equipos Asignados
        </h6>
        
        {!sector.equipos || sector.equipos.length === 0 ? (
          <p className="text-muted small text-center py-3 bg-light rounded border">
            No hay equipos asignados a este sector actualmente.
          </p>
        ) : (
          <ListGroup variant="flush" className="border rounded shadow-sm">
            {sector.equipos.map((equipo) => (
              <ListGroup.Item key={equipo.id} className="d-flex justify-content-between align-items-center py-3">
                <div>
                  <span className="fw-medium text-dark">{equipo.nombre}</span>
                  <br />
                  <span className="text-muted small">
                    <i className="bi bi-upc-scan me-1"></i>
                    SN: <span className="font-monospace">{equipo.numero_serie}</span>
                  </span>
                </div>
                <Badge bg="info" className="text-dark text-capitalize">
                  {equipo.tipo}
                </Badge>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}

      </Card.Body>
      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>
          Volver
        </Button>
        <Button variant="warning" onClick={onEditar} className="text-white">
          Editar
        </Button>
      </Card.Footer>
    </Card>
  );
}