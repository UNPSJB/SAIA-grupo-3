import { useState } from 'react';
import { Container, Modal } from 'react-bootstrap';
import { useAuth } from '../../shared/hooks/useAuth';
import { IncidenteList } from './IncidenteList';
import { IncidenteView } from './IncidenteView';
import { IncidenteForm } from './IncidenteForm';
import { IncidenteDeleteView } from './IncidenteDeleteView';
import { AccionCorrectivaForm } from './AccionCorrectivaForm';
import { AccionCorrectivaVigente } from './AccionCorrectivaVigente';
import { ReabrirIncidenteForm } from './ReabrirIncidenteForm';
import { useIncidente } from './useIncidente';
import {
  modificarAccionCorrectiva,
  reabrirIncidente,
  registrarAccionCorrectiva,
} from './accionCorrectivaApi';
import type {
  Incidente,
  IncidenteCreateInput,
  IncidenteUpdateInput,
} from './types';
import type {
  AccionCorrectiva,
  AccionCorrectivaInput,
  ReaperturaInput,
} from './accionCorrectivaTypes';

type ModoVista =
  | 'ver'
  | 'listado'
  | 'crear'
  | 'editar'
  | 'eliminar'
  | 'accionCorrectiva'   // modal sobre el listado
  | 'reabrir';           // modal sobre el listado

export function IncidentePage() {
  const { currentUser } = useAuth();
  const [modo, setModo] = useState<ModoVista>('listado');
  const [incidenteSeleccionado, setIncidenteSeleccionado] =
    useState<Incidente | null>(null);
  // Acción que se está corrigiendo desde el detalle (modal sobre la vista 'ver')
  const [accionEnEdicion, setAccionEnEdicion] = useState<AccionCorrectiva | null>(null);
  // Cambiar la key vuelve a montar el componente y fuerza que recargue sus datos
  const [recargaLista, setRecargaLista] = useState(0);
  const [recargaAccion, setRecargaAccion] = useState(0);

  const { guardar, eliminar } = useIncidente();

  const volverAlListado = () => {
    setModo('listado');
    setIncidenteSeleccionado(null);
  };

  const handleNuevo = () => {
    if (!currentUser?.operar) return;
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

  const handleAccionCorrectivaClick = (incidente: Incidente) => {
    setIncidenteSeleccionado(incidente);
    setModo('accionCorrectiva');
  };

  const handleReabrirClick = (incidente: Incidente) => {
    setIncidenteSeleccionado(incidente);
    setModo('reabrir');
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

  const handleRegistrarAccion = async (datos: AccionCorrectivaInput) => {
    if (!incidenteSeleccionado) return;
    await registrarAccionCorrectiva(incidenteSeleccionado.id, datos);
    setRecargaLista((n) => n + 1);
    volverAlListado();
  };

  const handleReabrir = async (datos: ReaperturaInput) => {
    if (!incidenteSeleccionado) return;
    await reabrirIncidente(incidenteSeleccionado.id, datos);
    setRecargaLista((n) => n + 1);
    volverAlListado();
  };

  const handleModificarAccion = async (datos: AccionCorrectivaInput) => {
    if (!accionEnEdicion) return;
    await modificarAccionCorrectiva(accionEnEdicion.id, datos);
    setAccionEnEdicion(null);
    setRecargaAccion((n) => n + 1);
  };

  const listaVisible = modo === 'listado' || modo === 'accionCorrectiva' || modo === 'reabrir';

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">
        Gestión de Incidentes
      </h2>

      {modo === 'ver' && incidenteSeleccionado && (
        <>
          {currentUser?.administrar === true && incidenteSeleccionado.estado === 'cerrado' && (
            <AccionCorrectivaVigente
              key={recargaAccion}
              incidenteId={incidenteSeleccionado.id}
              onEditar={setAccionEnEdicion}
            />
          )}
          <IncidenteView
            incidente={incidenteSeleccionado}
            onEditar={() => handleEditar(incidenteSeleccionado)}
            onVolver={volverAlListado}
          />
        </>
      )}

      {listaVisible && (
        <IncidenteList
          key={recargaLista}
          onViewClick={handleView}
          onNuevoClick={handleNuevo}
          onEditarClick={handleEditar}
          onEliminarClick={handleEliminarClick}
          onAccionCorrectivaClick={handleAccionCorrectivaClick}
          onReabrirClick={handleReabrirClick}
        />
      )}

      {((modo === 'crear' && currentUser?.operar) || (modo === 'editar' && currentUser?.administrar)) && (
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

      {/* Registrar acción correctiva (cierra el incidente) */}
      <Modal show={modo === 'accionCorrectiva'} onHide={volverAlListado} centered>
        <Modal.Header closeButton>
          <Modal.Title>Registrar acción correctiva</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {incidenteSeleccionado && (
            <AccionCorrectivaForm
              incidente={incidenteSeleccionado}
              onGuardar={handleRegistrarAccion}
              onCancelar={volverAlListado}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Reabrir incidente (pide motivo) */}
      <Modal show={modo === 'reabrir'} onHide={volverAlListado} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reabrir incidente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {incidenteSeleccionado && (
            <ReabrirIncidenteForm
              incidente={incidenteSeleccionado}
              onConfirmar={handleReabrir}
              onCancelar={volverAlListado}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Corregir la descripción de la acción vigente (desde el detalle) */}
      <Modal show={accionEnEdicion !== null} onHide={() => setAccionEnEdicion(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Modificar acción correctiva</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {incidenteSeleccionado && accionEnEdicion && (
            <AccionCorrectivaForm
              incidente={incidenteSeleccionado}
              accionInicial={accionEnEdicion}
              onGuardar={handleModificarAccion}
              onCancelar={() => setAccionEnEdicion(null)}
            />
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}
