import { Alert, Container, Spinner } from 'react-bootstrap';

import { useAuth } from '../../shared/hooks/useAuth';
import { ChecklistView } from './ChecklistView';

export function ChecklistPage() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container-fluid p-4">
        <Alert variant="danger">No hay un usuario autenticado.</Alert>
      </div>
    );
  }

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Checklist del Día</h2>
      <ChecklistView key={currentUser.id} personalId={currentUser.id} />
    </Container>
  );
}

export default ChecklistPage;
