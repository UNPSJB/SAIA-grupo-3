import { useState } from 'react';
import { Container, Modal, Button } from 'react-bootstrap';
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
import { useCrudRoute } from '../../shared/hooks/useCrudRoute';
import { getIncidenteById } from './incidenteApi';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';

import type { Incidente, IncidenteCreateInput, IncidenteUpdateInput } from './types';
import type {
  AccionCorrectiva,
  AccionCorrectivaInput,
  ReaperturaInput,
} from './accionCorrectivaTypes';

export function IncidentePage() {
  const { currentUser } = useAuth();
  const route = useCrudRoute<Incidente>('/incidentes', getIncidenteById);
  const [modalOperacion, setModalOperacion] = useState<{
    tipo: 'accionCorrectiva' | 'reabrir';
    incidente: Incidente;
  } | null>(null);
  const [accionEnEdicion, setAccionEnEdicion] = useState<AccionCorrectiva | null>(null);
  const [recargaLista, setRecargaLista] = useState(0);
  const [recargaAccion, setRecargaAccion] = useState(0);
  const { guardar, eliminar } = useIncidente(false);
  const handleGuardar = async (datos: IncidenteCreateInput | IncidenteUpdateInput) => {
    if (route.mode === 'editar' && route.item) {
      await guardar(datos, route.item.id);
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
    if (!modalOperacion?.incidente) return;
    await registrarAccionCorrectiva(modalOperacion.incidente.id, datos);
    setRecargaLista((n) => n + 1);
    setModalOperacion(null);
  };

  const handleReabrir = async (datos: ReaperturaInput) => {
    if (!modalOperacion?.incidente) return;
    await reabrirIncidente(modalOperacion.incidente.id, datos);
    setRecargaLista((n) => n + 1);
    setModalOperacion(null);
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

      {route.mode === 'ver' && route.item && (
        <>
          {currentUser?.administrar === true && route.item.estado === 'cerrado' && (
            <AccionCorrectivaVigente
              key={recargaAccion}
              incidenteId={route.item.id!}
              onEditar={setAccionEnEdicion}
            />
          )}
          <IncidenteView
            incidente={route.item as any}
            onEditar={() => route.open(route.item as any, 'editar')}
            onVolver={route.back}
          />
        </>
      )}

      {route.mode === 'listado' && !route.loading && !route.error && (
        <IncidenteList
          key={recargaLista}
          onViewClick={(doc) => route.open(doc as any)}
          onNuevoClick={() => {
            if (currentUser?.operar) route.open();
          }}
          onEditarClick={(doc) => route.open(doc as any, 'editar')}
          onEliminarClick={(doc) => route.open(doc as any, 'eliminar')}
          onAccionCorrectivaClick={(incidente) => setModalOperacion({ tipo: 'accionCorrectiva', incidente })}
          onReabrirClick={(incidente) => setModalOperacion({ tipo: 'reabrir', incidente })}
        />
      )}



      {((route.mode === 'crear' && currentUser?.operar) ||
        (route.mode === 'editar' && currentUser?.administrar && route.item)) && (
        <IncidenteForm
          key={route.item?.id ?? 'nuevo'}
          incidenteInicial={route.item as any}
          onGuardar={handleGuardar}
          onCancelar={route.mode === 'editar' ? () => route.open(route.item as any) : route.back}
        />
      )}

      {route.mode === 'eliminar' && route.item && (
        <IncidenteDeleteView
          incidente={route.item as any}
          onConfirmarEliminar={handleConfirmarEliminar}
          onCancelar={route.back}
        />
      )}

      <Modal show={modalOperacion?.tipo === 'accionCorrectiva'} onHide={() => setModalOperacion(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Registrar acción correctiva</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalOperacion?.incidente && (
            <AccionCorrectivaForm
              key={`${modalOperacion.incidente.id}-${accionEnEdicion?.id ?? 'nueva'}`}
              incidente={modalOperacion.incidente}
              onGuardar={handleRegistrarAccion}
              onCancelar={() => setModalOperacion(null)}
            />
          )}
        </Modal.Body>
      </Modal>

      <Modal show={modalOperacion?.tipo === 'reabrir'} onHide={() => setModalOperacion(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reabrir incidente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalOperacion?.incidente && (
            <ReabrirIncidenteForm
              incidente={modalOperacion.incidente}
              onConfirmar={handleReabrir}
              onCancelar={() => setModalOperacion(null)}
            />
          )}
        </Modal.Body>
      </Modal>

      <Modal show={accionEnEdicion !== null} onHide={() => setAccionEnEdicion(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Modificar acción correctiva</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {route.item && accionEnEdicion && (
            <AccionCorrectivaForm
              key={`${route.item.id}-${accionEnEdicion.id}`}
              incidente={route.item as any}
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