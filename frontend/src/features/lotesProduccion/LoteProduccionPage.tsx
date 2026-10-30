import { Button, Container } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useAuth } from '../../shared/hooks/useAuth';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { LoteProduccionForm } from './LoteProduccionForm';
import { LoteProduccionList } from './LoteProduccionList';
import { LoteProduccionView } from './LoteProduccionView';
import { getLoteProduccionById } from './loteProduccionApi';
import type { LoteProduccion, LoteProduccionCreate } from './types';
import { useLotesProduccion } from './useLotesProduccion';

export function LoteProduccionPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const route = useCrudRoute<LoteProduccion>('/lotes-produccion', getLoteProduccionById);
  const { mode, item, open, back, error, loading } = route;
  const { registrar } = useLotesProduccion(false);
  const recienRegistrado =
    (location.state as { recienRegistrado?: boolean } | null)?.recienRegistrado === true;

  const handleRegistrar = async (datos: LoteProduccionCreate) => {
    const lote = await registrar(datos);
    navigate(`/lotes-produccion/${lote.id}`, { state: { recienRegistrado: true } });
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Lotes de Producción</h2>
      {loading && <LoadingSpinner mensaje="Cargando lote..." />}
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          <Button onClick={back}>Volver al listado</Button>
        </>
      )}
      {mode === 'listado' && (
        <LoteProduccionList onNuevoClick={() => open()} onViewClick={(lote) => open(lote)} />
      )}
      {mode === 'crear' && currentUser?.operar && (
        <LoteProduccionForm onGuardar={handleRegistrar} onCancelar={back} />
      )}
      {mode === 'ver' && item && (
        <LoteProduccionView lote={item} onVolver={back} recienRegistrado={recienRegistrado} />
      )}
    </Container>
  );
}
