import { useState } from 'react';
import { Alert, Badge, Container, Button, Tab, Tabs } from 'react-bootstrap';
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

function PasosCreacion({ pasoActual }: { pasoActual: 1 | 2 }) {
  return (
    <div
      className="mx-auto mb-3 d-flex flex-wrap align-items-center gap-2 small"
      style={{ maxWidth: pasoActual === 2 ? '960px' : '650px' }}
    >
      <Badge bg={pasoActual === 1 ? 'primary' : 'success'}>
        {pasoActual === 1 ? '1' : <i className="bi bi-check" aria-hidden="true" />}
      </Badge>
      <span className={pasoActual === 1 ? 'fw-semibold' : 'text-body-secondary'}>
        Datos del insumo
      </span>
      <i className="bi bi-chevron-right text-body-secondary" aria-hidden="true" />
      <Badge bg={pasoActual === 2 ? 'primary' : 'secondary'}>2</Badge>
      <span className={pasoActual === 2 ? 'fw-semibold' : 'text-body-secondary'}>
        Información nutricional
      </span>
    </div>
  );
}

export function InsumoPage() {
  const route = useCrudRoute<Insumo>('/insumos', getInsumoById);
  const { mode, item, open, back, error, loading } = route;
  const { guardar, eliminar } = useInsumo(false);
  const [insumoCreado, setInsumoCreado] = useState<Insumo | null>(null);

  const finalizar = () => {
    setInsumoCreado(null);
    back();
  };

  const handleGuardar = async (datos: InsumoCreate) => {
    if (mode === 'editar' && item?.id) {
      await guardar(datos, item.id);
      back();
      return;
    }
    const creado = await guardar(datos);
    setInsumoCreado(creado);
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
          <Button onClick={finalizar}>Volver al listado</Button>
        </>
      )}
      {mode === 'listado' && (
        <InsumoList
          onViewClick={(item) => open(item)}
          onNuevoClick={() => {
            setInsumoCreado(null);
            open();
          }}
          onEditarClick={(item) => open(item, 'editar')}
          onEliminarClick={(item) => open(item, 'eliminar')}
        />
      )}
      {mode === 'ver' && item && (
        <InsumoView insumo={item} onEditar={() => open(item, 'editar')} onVolver={back} />
      )}
      {mode === 'crear' && !insumoCreado && (
        <>
          <PasosCreacion pasoActual={1} />
          <InsumoForm
            key="nuevo"
            insumoInicial={null}
            etiquetaGuardar="Siguiente"
            onGuardar={handleGuardar}
            onCancelar={finalizar}
          />
        </>
      )}
      {mode === 'crear' && insumoCreado && (
        <div className="mx-auto" style={{ maxWidth: '960px' }}>
          <PasosCreacion pasoActual={2} />
          <Alert
            variant="success"
            className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4"
          >
            <div>
              <strong>Insumo «{insumoCreado.nombre}» creado.</strong> Podés cargar su información
              nutricional ahora o finalizar para volver al listado.
            </div>
            <Button variant="success" size="sm" onClick={finalizar}>
              <i className="bi bi-check-lg me-1" aria-hidden="true" />
              Finalizar
            </Button>
          </Alert>
          <NutricionInsumo key={insumoCreado.id} insumoId={insumoCreado.id} />
        </div>
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