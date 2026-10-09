import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { IncidenteList } from './IncidenteList';
import { IncidenteView } from './IncidenteView';
import { IncidenteForm } from './IncidenteForm';
import { IncidenteDeleteView } from './IncidenteDeleteView';
import { useIncidente } from './useIncidente';
import type {
  Incidente,
  IncidenteCreateInput,
  IncidenteUpdateInput,
} from './types';

type ModoVista = 'ver' | 'listado' | 'crear' | 'editar' | 'eliminar';

export function IncidentePage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [incidenteSeleccionado, setIncidenteSeleccionado] =
    useState<Incidente | null>(null);

  const { guardar, eliminar } = useIncidente();

  const volverAlListado = () => {
    setModo('listado');
    setIncidenteSeleccionado(null);
  };

  const handleNuevo = () => {
    setIncidenteSeleccionado(null);
    setModo('crear');
  };

  const handleView = (incidente: Incidente) => {
    setIncidenteSeleccionado(incidente);
    setModo('ver');
  };

  const handleEditar = (incidente: Incidente) => {
    setIncidenteSeleccionado(incidente);
    setModo('editar');
  };

  const handleEliminarClick = (incidente: Incidente) => {
    setIncidenteSeleccionado(incidente);
    setModo('eliminar');
  };

  const handleGuardar = async (
    datos: IncidenteCreateInput | IncidenteUpdateInput
  ) => {
    if (modo === 'editar' && incidenteSeleccionado) {
      await guardar(datos, incidenteSeleccionado.id);
    } else {
      await guardar(datos);
    }

    volverAlListado();
  };

  const handleConfirmarEliminar = async (id: number) => {
    await eliminar(id);
    volverAlListado();
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">
        Gestión de Incidentes
      </h2>

      {modo === 'ver' && incidenteSeleccionado && (
        <IncidenteView
          incidente={incidenteSeleccionado}
          onEditar={() => handleEditar(incidenteSeleccionado)}
          onVolver={volverAlListado}
        />
      )}

      {modo === 'listado' && (
        <IncidenteList
          onViewClick={handleView}
          onNuevoClick={handleNuevo}
          onEditarClick={handleEditar}
          onEliminarClick={handleEliminarClick}
        />
      )}

      {(modo === 'crear' || modo === 'editar') && (
        <IncidenteForm
          incidenteInicial={incidenteSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={volverAlListado}
        />
      )}

      {modo === 'eliminar' && incidenteSeleccionado && (
        <IncidenteDeleteView
          incidente={incidenteSeleccionado}
          onConfirmarEliminar={handleConfirmarEliminar}
          onCancelar={volverAlListado}
        />
      )}
    </Container>
  );
}
