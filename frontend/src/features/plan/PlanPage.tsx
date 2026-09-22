import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { PlanList } from './PlanList';
import { PlanForm } from './PlanForm';
import { usePlan } from './usePlan';
import type { PlanCreate } from './types';

type ModoVista = 'listado' | 'crear';

export function PlanPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const { guardar } = usePlan();

  const handleGuardar = async (datos: PlanCreate) => {
    await guardar(datos);
    setModo('listado');
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Planes</h2>
      {modo === 'listado' && <PlanList onNuevoClick={() => setModo('crear')} />}
      {modo === 'crear' && <PlanForm onGuardar={handleGuardar} onCancelar={() => setModo('listado')} />}
    </Container>
  );
}