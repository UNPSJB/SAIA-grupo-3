import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { AuditoriaList } from './AuditoriaList';
import { AuditoriaView } from './AuditoriaView';
import type { PlanRealizado } from './types';

type ModoVista = 'listado' | 'ver';

export function AuditoriaPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanRealizado | null>(null);

  const handleView = (plan: PlanRealizado) => {
    setPlanSeleccionado(plan);
    setModo('ver');
  };

  const handleVolver = () => {
    setPlanSeleccionado(null);
    setModo('listado');
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">
        <i className="bi bi-shield-check me-2"></i>Auditoría y Registros Históricos
      </h2>
      
      {modo === 'listado' && <AuditoriaList onViewClick={handleView} />}
      {modo === 'ver' && planSeleccionado && <AuditoriaView plan={planSeleccionado} onVolver={handleVolver} />}
    </Container>
  );
}