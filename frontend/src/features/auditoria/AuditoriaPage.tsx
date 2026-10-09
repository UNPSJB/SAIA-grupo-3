import { Container, Button } from 'react-bootstrap';
import { AuditoriaList } from './AuditoriaList';
import { AuditoriaView } from './AuditoriaView';
import { getPlanRealizadoById } from './auditoriaApi';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
export function AuditoriaPage() {
  const route = useCrudRoute('/auditoria', getPlanRealizadoById);
  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Auditoría y Registros Históricos</h2>
      {route.loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {route.error && (
        <>
          <ErrorAlert mensaje={route.error} />
          <Button onClick={route.back}>Volver</Button>
        </>
      )}
      {route.mode === 'listado' && <AuditoriaList onViewClick={(item) => route.open(item)} />}
      {route.mode === 'ver' && route.item && (
        <AuditoriaView plan={route.item} onVolver={route.back} />
      )}
    </Container>
  );
}
