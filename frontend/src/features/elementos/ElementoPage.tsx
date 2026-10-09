import { Container, Button } from 'react-bootstrap';
import { ElementoList } from './ElementoList';
import { ElementoForm } from './ElementoForm';
import { ElementoView } from './ElementoView';
import { ElementoDeleteView } from './ElementoDeleteView';
import { useElemento } from './useElemento';
import { getElementoById } from './elementoApi';
import type { Elemento } from './types';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';

export function ElementoPage() {
  const route = useCrudRoute<Elemento>('/elementos', getElementoById);
  const { mode, item, open, back, error, loading } = route;
  const { guardar, eliminar } = useElemento(false);
  const handleGuardar = async (datos: Elemento) => {
    await guardar(datos, mode === 'editar' ? item?.id : undefined);
    back();
  };
  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    back();
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Elementos de limpieza</h2>
      {loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          <Button onClick={back}>Volver al listado</Button>
        </>
      )}
      {mode === 'listado' && (
        <ElementoList
          onViewClick={(item) => open(item)}
          onNuevoClick={() => open()}
          onEditarClick={(item) => open(item, 'editar')}
          onEliminarClick={(item) => open(item, 'eliminar')}
        />
      )}
      {mode === 'ver' && item && (
        <ElementoView elemento={item} onEditar={() => open(item, 'editar')} onVolver={back} />
      )}
      {(mode === 'crear' || (mode === 'editar' && item)) && (
        <ElementoForm
          key={item?.id ?? 'nuevo'}
          elementoInicial={mode === 'crear' ? null : item}
          onGuardar={handleGuardar}
          onCancelar={back}
        />
      )}
      {mode === 'eliminar' && item && item.id !== undefined && (
        <ElementoDeleteView
          elemento={item}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={back}
        />
      )}
    </Container>
  );
}
