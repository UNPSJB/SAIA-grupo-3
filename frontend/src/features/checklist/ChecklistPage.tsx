import { useEffect, useState } from 'react';
import { Alert, Spinner } from 'react-bootstrap';

import { useAuth } from '../../shared/hooks/useAuth';
import { ChecklistView } from './ChecklistView';

export function ChecklistPage() {
  const { currentUser, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      setError('No se pudo obtener el usuario autenticado.');
    } else {
      setError(null);
    }
  }, [currentUser, isLoading]);

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
        <Alert variant="danger">
          {error ?? 'No hay un usuario autenticado.'}
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <ChecklistView
        key={currentUser.id}
        personalId={currentUser.id}
      />
    </div>
  );
}

export default ChecklistPage;