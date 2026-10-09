import { Container, Button } from 'react-bootstrap';
import { EquipoList } from './EquipoList';
import { EquipoForm } from './EquipoForm';
import { EquipoView } from './EquipoView';
import { EquipoDeleteView } from './EquipoDeleteView';
import { useEquipo } from './useEquipo';
import { getEquipoById } from './equipoApi';
import type { Equipo } from './types';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';

export function EquipoPage() {
  const route = useCrudRoute<Equipo>('/equipos', getEquipoById);
  const { mode, item, open, back, error, loading } = route;
  const { guardar, eliminar } = useEquipo(false);
  const handleGuardar = async (datos: Equipo) => {
    await guardar(datos, mode === 'editar' ? item?.id : undefined);
    back();
  };
  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    back();
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Equipos e Instrumentos</h2>
      {loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          <Button onClick={back}>Volver al listado</Button>
        </>
      )}
      {mode === 'listado' && (
        <EquipoList
          onViewClick={(item) => open(item)}
          onNuevoClick={() => open()}
          onEditarClick={(item) => open(item, 'editar')}
          onEliminarClick={(item) => open(item, 'eliminar')}
        />
      )}
      {mode === 'ver' && item && (
        <EquipoView equipo={item} onEditar={() => open(item, 'editar')} onVolver={back} />
      )}
      {(mode === 'crear' || (mode === 'editar' && item)) && (
        <EquipoForm
          key={item?.id ?? 'nuevo'}
          equipoInicial={mode === 'crear' ? null : item}
          onGuardar={handleGuardar}
          onCancelar={back}
        />
      )}
      {mode === 'eliminar' && item && item.id !== undefined && (
        <EquipoDeleteView
          equipo={item}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={back}
        />
      )}
    </Container>
  );
}
