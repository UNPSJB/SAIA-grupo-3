import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { PlanList } from './PlanList';
import { PlanForm } from './PlanForm';
import { PlanView } from './PlanView';
import { PlanDeleteView } from './PlanDeleteView';
import { usePlan } from './usePlan';
import { getPlanById, updatePlan } from './planApi';
import type { Plan, PlanCreate } from './types';

type ModoVista = 'ver' | 'listado' | 'crear' | 'editar' | 'eliminar';

export function PlanPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [planSeleccionado, setPlanSeleccionado] = useState<Plan | null>(null);
  const { guardar, eliminar } = usePlan();

  const handleNuevo = () => { setPlanSeleccionado(null); setModo('crear'); };
  const handleView = (plan: Plan) => { setPlanSeleccionado(plan); setModo('ver'); };
  const handleEditar = (plan: Plan) => { setPlanSeleccionado(plan); setModo('editar'); };
  const handleEliminarClick = (plan: Plan) => { setPlanSeleccionado(plan); setModo('eliminar'); };

  const handleGuardar = async (datos: PlanCreate) => {
    if (modo === 'editar' && planSeleccionado?.id) {
      await guardar(datos, planSeleccionado.id);
    } else {
      await guardar(datos);
    }
    volverAlListado();
  };

  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    volverAlListado();
  };

  const handleDesvincularTarea = async (tareaId: number) => {
    if (!planSeleccionado?.id) return;
    if (confirm('¿Estás seguro de que deseas desvincular esta tarea del plan?')) {
      try {
        const nuevosIds = planSeleccionado.tareas?.filter(t => t.id !== tareaId).map(t => t.id as number) || [];
        await updatePlan(planSeleccionado.id, { tarea_ids: nuevosIds });
        const planActualizado = await getPlanById(planSeleccionado.id);
        setPlanSeleccionado(planActualizado);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Error al desvincular la tarea.');
      }
    }
  };

  const volverAlListado = () => {
    setModo('listado');
    setPlanSeleccionado(null);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Planes</h2>
      {modo === 'ver' && planSeleccionado && (
        <PlanView 
          plan={planSeleccionado} 
          onEditar={() => handleEditar(planSeleccionado)} 
          onVolver={volverAlListado} 
          onDesvincularTarea={handleDesvincularTarea}
        />
      )}
      {modo === 'listado' && <PlanList onViewClick={handleView} onNuevoClick={handleNuevo} onEditarClick={handleEditar} onEliminarClick={handleEliminarClick} />}
      {(modo === 'crear' || modo === 'editar') && <PlanForm planInicial={planSeleccionado} onGuardar={handleGuardar} onCancelar={volverAlListado} />}
      {modo === 'eliminar' && planSeleccionado && planSeleccionado.id !== undefined && <PlanDeleteView plan={planSeleccionado} onConfirmarEliminar={handleConfirmarBaja} onCancelar={volverAlListado} />}
    </Container>
  );
}