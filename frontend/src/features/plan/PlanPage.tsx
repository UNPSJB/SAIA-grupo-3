import { Container, Button } from 'react-bootstrap';
import { PlanList } from './PlanList';
import { PlanForm } from './PlanForm';
import { PlanView } from './PlanView';
import { PlanDeleteView } from './PlanDeleteView';
import { usePlan } from './usePlan';
import { getPlanById, updatePlan } from './planApi';
import type { Plan, PlanCreate } from './types';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';

export function PlanPage() {
  const route = useCrudRoute<Plan>('/planes', getPlanById);
  const { mode, item, open, back, error, loading } = route;
  const { guardar, eliminar } = usePlan(false);
  const handleGuardar = async (datos: PlanCreate) => {
    await guardar(datos, mode === 'editar' ? item?.id : undefined);
    back();
  };
  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    back();
  };
  const handleDesvincularTarea = async (tareaId: number) => {
    if (!item?.id || !confirm('¿Desvincular esta tarea del plan?')) return;
    try {
      await updatePlan(item.id, {
        tarea_ids: item.tareas?.filter((t) => t.id !== tareaId).map((t) => t.id as number) || [],
      });
      await route.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al desvincular.');
    }
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Planes</h2>
      {loading && <LoadingSpinner mensaje="Cargando detalle..." />}
      {error && (
        <>
          <ErrorAlert mensaje={error} />
          <Button onClick={back}>Volver al listado</Button>
        </>
      )}
      {mode === 'listado' && (
        <PlanList
          onViewClick={(item) => open(item)}
          onNuevoClick={() => open()}
          onEditarClick={(item) => open(item, 'editar')}
          onEliminarClick={(item) => open(item, 'eliminar')}
        />
      )}
      {mode === 'ver' && item && (
        <PlanView
          plan={item}
          onEditar={() => open(item, 'editar')}
          onVolver={back}
          onDesvincularTarea={handleDesvincularTarea}
        />
      )}
      {(mode === 'crear' || (mode === 'editar' && item)) && (
        <PlanForm
          key={item?.id ?? 'nuevo'}
          planInicial={mode === 'crear' ? null : item}
          onGuardar={handleGuardar}
          onCancelar={back}
        />
      )}
      {mode === 'eliminar' && item && item.id !== undefined && (
        <PlanDeleteView plan={item} onConfirmarEliminar={handleConfirmarBaja} onCancelar={back} />
      )}
    </Container>
  );
}
