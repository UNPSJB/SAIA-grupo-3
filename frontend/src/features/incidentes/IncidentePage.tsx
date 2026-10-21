import { useState } from 'react';
import { Button, Container, Modal } from 'react-bootstrap';
import { useAuth } from '../../shared/hooks/useAuth';
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { IncidenteList } from './IncidenteList';
import { IncidenteView } from './IncidenteView';
import { IncidenteForm } from './IncidenteForm';
import { IncidenteDeleteView } from './IncidenteDeleteView';
import { AccionCorrectivaForm } from './AccionCorrectivaForm';
import { AccionCorrectivaVigente } from './AccionCorrectivaVigente';
import { ReabrirIncidenteForm } from './ReabrirIncidenteForm';
import { useIncidente } from './useIncidente';
import { getIncidenteById } from './incidenteApi';
import {
  modificarAccionCorrectiva,
  reabrirIncidente,
  registrarAccionCorrectiva,
} from './accionCorrectivaApi';
import type { Incidente, IncidenteCreateInput, IncidenteUpdateInput } from './types';
import type {
  AccionCorrectiva,
  AccionCorrectivaInput,
  ReaperturaInput,
} from './accionCorrectivaTypes';

type ModalListado = { tipo: 'accionCorrectiva' | 'reabrir'; incidente: Incidente } | null;

export function IncidentePage() {
  const { currentUser } = useAuth();
  const route = useCrudRoute<Incidente>('/incidentes', getIncidenteById);
  const { mode: modo, item: incidenteSeleccionado } = route;

  const [modalListado, setModalListado] = useState<ModalListado>(null);
  const [accionEnEdicion, setAccionEnEdicion] = useState<AccionCorrectiva | null>(null);
  const [recargaLista, setRecargaLista] = useState(0);
  const [recargaAccion, setRecargaAccion] = useState(0);

  const { guardar, eliminar } = useIncidente(false);

  const cerrarModalListado = () => setModalListado(null);

  const handleNuevo = () => {
    if (!currentUser?.operar) return;
    route.open();
  };

  const handleView = (incidente: Incidente) => route.open(incidente);
  const handleEditar = (incidente: Incidente) => route.open(incidente, 'editar');
  const handleEliminarClick = (incidente: Incidente) => route.open(incidente, 'eliminar');

  const handleAccionCorrectivaClick = (incidente: Incidente) => {
    setModalListado({ tipo: 'accionCorrectiva', incidente });
  };

  const handleReabrirClick = (incidente: Incidente) => {
    setModalListado({ tipo: 'reabrir', incidente });
  };

  const handleGuardar = async (datos: IncidenteCreateInput | IncidenteUpdateInput) => {
    if (modo === 'editar' && incidenteSeleccionado) {
      await guardar(datos, incidenteSeleccionado.id);
    } else {
      await guardar(datos);
    }
    route.back();
  };

  const handleConfirmarEliminar = async (id: number) => {
    await eliminar(id);
    route.back();
  };

  const handleRegistrarAccion = async (datos: AccionCorrectivaInput) => {
    if (!modalListado) return;
    await registrarAccionCorrectiva(modalListado.incidente.id, datos);
    setRecargaLista((n) => n + 1);
    cerrarModalListado();
  };

  const handleReabrir = async (datos: ReaperturaInput) => {
    if (!modalListado) return;
    await reabrirIncidente(modalListado.incidente.id, datos);
    setRecargaLista((n) => n + 1);
    cerrarModalListado();
  };

  const handleModificarAccion = async (datos: AccionCorrectivaInput) => {
    if (!accionEnEdicion) return;
    await modificarAccionCorrectiva(accionEnEdicion.id, datos);
    setAccionEnEdicion(null);
    setRecargaAccion((n) => n + 1);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">
        {currentUser?.administrar ? 'Gestión de Incidentes' : 'Mis incidentes'}
      </h2>

      {route.loading && <LoadingSpinner mensaje="Cargando incidente..." />}

      {route.error && (
        <>
          <ErrorAlert mensaje={route.error} />
          <Button variant="secondary" onClick={route.back} className="mt-2">
            Volver
          </Button>
        </>
      )}

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
            onVolver={route.back}
          />
        </>
      )}

      {modo === 'listado' && !route.loading && !route.error && (
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

      {((modo === 'crear' && currentUser?.operar) ||
        (modo === 'editar' && currentUser?.administrar && incidenteSeleccionado)) && (
        <IncidenteForm
          key={incidenteSeleccionado?.id ?? 'nuevo'}
          incidenteInicial={modo === 'editar' ? incidenteSeleccionado : null}
          onGuardar={handleGuardar}
          onCancelar={route.back}
        />
      )}

      {modo === 'eliminar' && incidenteSeleccionado && (
        <IncidenteDeleteView
          incidente={incidenteSeleccionado}
          onConfirmarEliminar={handleConfirmarEliminar}
          onCancelar={route.back}
        />
      )}

      {/* Registrar acción correctiva (cierra el incidente) */}
      <Modal show={modalListado?.tipo === 'accionCorrectiva'} onHide={cerrarModalListado} centered>
        <Modal.Header closeButton>
          <Modal.Title>Registrar acción correctiva</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalListado?.tipo === 'accionCorrectiva' && (
            <AccionCorrectivaForm
              key={`${modalListado.incidente.id}-nueva`}
              incidente={modalListado.incidente}
              onGuardar={handleRegistrarAccion}
              onCancelar={cerrarModalListado}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Reabrir incidente (pide motivo) */}
      <Modal show={modalListado?.tipo === 'reabrir'} onHide={cerrarModalListado} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reabrir incidente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalListado?.tipo === 'reabrir' && (
            <ReabrirIncidenteForm
              incidente={modalListado.incidente}
              onConfirmar={handleReabrir}
              onCancelar={cerrarModalListado}
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
              key={`${incidenteSeleccionado.id}-${accionEnEdicion.id}`}
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