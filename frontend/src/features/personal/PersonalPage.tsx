import { Container, Button } from 'react-bootstrap';
import { PersonalList } from './PersonalList';
import { PersonalForm } from './PersonalForm';
import { PersonalView } from './PersonalView';
import { PersonalDeleteView } from './PersonalDeleteView';
import { usePersonal } from './usePersonal';
import { getPersonalById } from './personalApi';
import type { Personal, PersonalCreateInput, PersonalUpdateInput } from './types';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';

export function PersonalPage() {
  const route = useCrudRoute<Personal>('/personal', getPersonalById);
  const { mode, item, open, back, error, loading } = route;
  const { guardar, eliminar } = usePersonal(false, false);
  const handleGuardar = async (datos: PersonalCreateInput | PersonalUpdateInput) => {
    await guardar(datos, mode === 'editar' ? item?.id : undefined);
    back();
  };
  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    back();
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Personal</h2>
      {loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          <Button onClick={back}>Volver al listado</Button>
        </>
      )}
      {mode === 'listado' && (
        <PersonalList
          onViewClick={(item) => open(item)}
          onNuevoClick={() => open()}
          onEditarClick={(item) => open(item, 'editar')}
          onEliminarClick={(item) => open(item, 'eliminar')}
        />
      )}
      {mode === 'ver' && item && (
        <PersonalView personal={item} onEditar={() => open(item, 'editar')} onVolver={back} />
      )}
      {(mode === 'crear' || (mode === 'editar' && item)) && (
        <PersonalForm
          key={item?.id ?? 'nuevo'}
          personalInicial={mode === 'crear' ? null : item}
          onGuardar={handleGuardar}
          onCancelar={back}
        />
      )}
      {mode === 'eliminar' && item && item.id !== undefined && (
        <PersonalDeleteView
          personal={item}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={back}
        />
      )}
    </Container>
  );
}
