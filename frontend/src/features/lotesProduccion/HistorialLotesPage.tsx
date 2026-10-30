import { Button, Container } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { HistorialLoteView } from './HistorialLoteView';
import { HistorialLotesList } from './HistorialLotesList';
import { getLoteProduccionById } from './loteProduccionApi';

export function HistorialLotesPage() {
  const route = useCrudRoute('/lotes', getLoteProduccionById);
  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Historial de lotes</h2>
      {route.loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {route.error && (
        <>
          <ErrorAlert mensaje={route.error} />
          <Button onClick={route.back}>Volver</Button>
        </>
      )}
      {route.mode === 'listado' && <HistorialLotesList onViewClick={(lote) => route.open(lote)} />}
      {route.mode === 'ver' && route.item && (
        <HistorialLoteView lote={route.item} onVolver={route.back} onCerrado={route.refresh} />
      )}
    </Container>
  );
}
