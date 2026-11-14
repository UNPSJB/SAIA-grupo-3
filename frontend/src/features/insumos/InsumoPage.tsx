import { Container, Button, Tab, Tabs } from 'react-bootstrap';
import { InsumoList } from './InsumoList';
import { InsumoForm } from './InsumoForm';
import { InsumoView } from './InsumoView';
import { InsumoDeleteView } from './InsumoDeleteView';
import { useInsumo } from './useInsumo';
import { getInsumoById } from './InsumoApi';
import type { Insumo, InsumoCreate } from './types';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { NutricionInsumo } from '../nutricion';

export function InsumoPage() {
  const route = useCrudRoute<Insumo>('/insumos', getInsumoById);
  const { mode, item, open, back, error, loading } = route;
  const { guardar, eliminar } = useInsumo(false);
  const handleGuardar = async (datos: InsumoCreate) => {
    await guardar(datos, mode === 'editar' ? item?.id : undefined);
    back();
  };
  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    back();
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Insumos</h2>
      {loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          <Button onClick={back}>Volver al listado</Button>
        </>
      )}
      {mode === 'listado' && (
        <InsumoList
          onViewClick={(item) => open(item)}
          onNuevoClick={() => open()}
          onEditarClick={(item) => open(item, 'editar')}
          onEliminarClick={(item) => open(item, 'eliminar')}
        />
      )}
      {mode === 'ver' && item && (
        <InsumoView insumo={item} onEditar={() => open(item, 'editar')} onVolver={back} />
      )}
      {mode === 'crear' && (
        <InsumoForm key="nuevo" insumoInicial={null} onGuardar={handleGuardar} onCancelar={back} />
      )}
      {mode === 'editar' && item && (
        <Tabs defaultActiveKey="datos" id="insumo-pestanas" className="mb-3" mountOnEnter>
          <Tab eventKey="datos" title="Datos">
            <InsumoForm
              key={item.id}
              insumoInicial={item}
              onGuardar={handleGuardar}
              onCancelar={back}
            />
          </Tab>
          <Tab eventKey="nutricion" title="Información nutricional">
            <NutricionInsumo key={item.id} insumoId={item.id} />
          </Tab>
        </Tabs>
      )}
      {mode === 'eliminar' && item && item.id !== undefined && (
        <InsumoDeleteView
          insumo={item}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={back}
        />
      )}
    </Container>
  );
}
