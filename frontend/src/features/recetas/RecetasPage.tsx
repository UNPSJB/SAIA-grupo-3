import { Card, Container } from 'react-bootstrap';
import { useAuth } from '../../shared/hooks/useAuth';

export function RecetasPage() {
  const { currentUser } = useAuth();

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Recetas</h2>
      <Card className="shadow-sm">
        <Card.Body className="d-flex align-items-start gap-3">
          <i className="bi bi-journal-bookmark fs-2 text-body-secondary" aria-hidden="true" />
          <div>
            <Card.Title as="h3" className="h5">
              Sección en preparación
            </Card.Title>
            <Card.Text className="text-body-secondary mb-0">
              {currentUser?.administrar
                ? 'Acá vas a poder cargar la receta versionada de cada producto, con sus ingredientes, aditivos, rendimiento y pasos de elaboración.'
                : 'Acá vas a poder consultar la receta vigente de cada producto antes de elaborarlo.'}
            </Card.Text>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
