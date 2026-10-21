import { Container, Button } from 'react-bootstrap';
import { VencimientosCalibracionList } from './VencimientosCalibracionList';
import { EquipoView } from './EquipoView';
import { EquipoForm } from './EquipoForm';
import { getEquipoById, updateEquipo } from './equipoApi';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Equipo, VencimientoCalibracion } from './types';

export function VencimientosCalibracionPage() {
  const route = useCrudRoute<Equipo>('/vencimientos/calibracion', getEquipoById);
  const { mode, item: equipoSeleccionado, error, loading, open, back, refresh } = route;
  const handleVerEquipo = (vencimiento: VencimientoCalibracion) => {
    open(vencimiento.equipo as unknown as Equipo);
  };

  const handleGuardar = async (datos: Equipo) => {
    if (!equipoSeleccionado?.id) return;
    await updateEquipo(equipoSeleccionado.id, datos);
    await refresh();
    open(equipoSeleccionado); 
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Control de Vencimientos</h2>

      {loading && <LoadingSpinner mensaje="Cargando equipo..." />}

      {error && (
        <>
          <ErrorAlert mensaje={error} />
          <Button variant="secondary" onClick={back} className="mt-2">
            Volver
          </Button>
        </>
      )}

      {mode === 'listado' && !loading && !error && (
        <VencimientosCalibracionList onVerEquipo={handleVerEquipo} />
      )}

      {mode === 'ver' && equipoSeleccionado && (
        <EquipoView
          key={equipoSeleccionado.id}
          equipo={equipoSeleccionado}
          onEditar={() => open(equipoSeleccionado, 'editar')}
          onVolver={back}
          onCalibracionesActualizadas={refresh}
        />
      )}

      {mode === 'editar' && equipoSeleccionado && (
        <EquipoForm
          key={equipoSeleccionado.id}
          equipoInicial={equipoSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={() => open(equipoSeleccionado)}
        />
      )}
    </Container>
  );
}