import { Container, Button } from 'react-bootstrap';
import { TareaList } from './TareaList';
import { TareaForm } from './TareaForm';
import { TareaView } from './TareaView';
import { TareaDeleteView } from './TareaDeleteView';
import { useTarea } from './useTarea';
import { getTareaById } from './tareaApi';
import type { Tarea, TareaCreate } from './types';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';

export function TareaPage() {
  const route = useCrudRoute<Tarea>('/tarea', getTareaById);
  const { mode, item, open, back, error, loading } = route;
  const { guardar, eliminar } = useTarea(false);
  const handleGuardar = async (datos: TareaCreate) => {
    await guardar(datos, mode === 'editar' ? item?.id : undefined);
    back();
  };
  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    back();
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Tareas</h2>
      {loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          <Button onClick={back}>Volver al listado</Button>
        </>
      )}
      {mode === 'listado' && (
        <TareaList
          onViewClick={(item) => open(item)}
          onNuevoClick={() => open()}
          onEditarClick={(item) => open(item, 'editar')}
          onEliminarClick={(item) => open(item, 'eliminar')}
        />
      )}
      {mode === 'ver' && item && (
        <TareaView tarea={item} onEditar={() => open(item, 'editar')} onVolver={back} />
      )}
      {(mode === 'crear' || (mode === 'editar' && item)) && (
        <TareaForm
          key={item?.id ?? 'nuevo'}
          tareaInicial={mode === 'crear' ? null : item}
          onGuardar={handleGuardar}
          onCancelar={back}
        />
      )}
      {mode === 'eliminar' && item && item.id !== undefined && (
        <TareaDeleteView tarea={item} onConfirmarEliminar={handleConfirmarBaja} onCancelar={back} />
      )}
    </Container>
  );
}
