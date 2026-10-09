import { Container, Button } from 'react-bootstrap';
import { SectorList } from './SectorList';
import { SectorForm } from './SectorForm';
import { SectorView } from './SectorView';
import { SectorDeleteView } from './SectorDeleteView';
import { useSector } from './useSector';
import { getSectorById } from './sectorApi';
import type { Sector } from './types';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';

export function SectorPage() {
  const route = useCrudRoute<Sector>('/sectores', getSectorById);
  const { mode, item, open, back, error, loading } = route;
  const { guardar, eliminar } = useSector(false);
  const handleGuardar = async (datos: Sector) => {
    await guardar(datos, mode === 'editar' ? item?.id : undefined);
    back();
  };
  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    back();
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Sectores</h2>
      {loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          <Button onClick={back}>Volver al listado</Button>
        </>
      )}
      {mode === 'listado' && (
        <SectorList
          onViewClick={(item) => open(item)}
          onNuevoClick={() => open()}
          onEditarClick={(item) => open(item, 'editar')}
          onEliminarClick={(item) => open(item, 'eliminar')}
        />
      )}
      {mode === 'ver' && item && (
        <SectorView sector={item} onEditar={() => open(item, 'editar')} onVolver={back} />
      )}
      {(mode === 'crear' || (mode === 'editar' && item)) && (
        <SectorForm
          key={item?.id ?? 'nuevo'}
          sectorInicial={mode === 'crear' ? null : item}
          onGuardar={handleGuardar}
          onCancelar={back}
        />
      )}
      {mode === 'eliminar' && item && item.id !== undefined && (
        <SectorDeleteView
          sector={item}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={back}
        />
      )}
    </Container>
  );
}
