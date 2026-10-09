import { Alert, Card } from 'react-bootstrap';

export function CalibracionPage() {
  return (
    <Card className="shadow-sm border-0">
      <Card.Header as="h5" className="bg-light text-secondary py-3">
        Vencimientos de Calibración
      </Card.Header>
      <Card.Body>
        <Alert variant="info" className="mb-0">
          La gestión de vencimientos de calibración está pendiente de implementación
        </Alert>
      </Card.Body>
    </Card>
  );
}
