import { Container, Button } from 'react-bootstrap';
import { InsumoQuimicoList } from './InsumoQuimicoList';
import { InsumoQuimicoForm } from './InsumoQuimicoForm';
import { InsumoQuimicoView } from './InsumoQuimicoView';
import { InsumoQuimicoDeleteView } from './InsumoQuimicoDeleteView';
import { useInsumoQuimico } from './useInsumoQuimico';
import { getInsumoQuimicoById } from './insumoQuimicoApi';
import type { InsumoQuimico, InsumoQuimicoCreate } from './types';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';

export function InsumoQuimicoPage() {
  const route = useCrudRoute<InsumoQuimico>('/insumos-quimicos', getInsumoQuimicoById);
  const { mode, item, open, back, error, loading } = route;
  const { guardar, eliminar } = useInsumoQuimico(false);
  const handleGuardar = async (datos: InsumoQuimicoCreate) => {
    await guardar(datos, mode === 'editar' ? item?.id : undefined);
    back();
  };
  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    back();
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Insumos Químicos</h2>
      {loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          <Button onClick={back}>Volver al listado</Button>
        </>
      )}
      {mode === 'listado' && (
        <InsumoQuimicoList
          onViewClick={(item) => open(item)}
          onNuevoClick={() => open()}
          onEditarClick={(item) => open(item, 'editar')}
          onEliminarClick={(item) => open(item, 'eliminar')}
        />
      )}
      {mode === 'ver' && item && (
        <InsumoQuimicoView insumo={item} onEditar={() => open(item, 'editar')} onVolver={back} />
      )}
      {(mode === 'crear' || (mode === 'editar' && item)) && (
        <InsumoQuimicoForm
          key={item?.id ?? 'nuevo'}
          insumoInicial={mode === 'crear' ? null : item}
          onGuardar={handleGuardar}
          onCancelar={back}
        />
      )}
      {mode === 'eliminar' && item && item.id !== undefined && (
        <InsumoQuimicoDeleteView
          insumo={item}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={back}
        />
      )}
    </Container>
  );
}
