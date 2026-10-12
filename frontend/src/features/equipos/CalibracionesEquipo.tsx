import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { CalibracionDeleteView } from './CalibracionDeleteView';
import { CalibracionForm } from './CalibracionForm';
import { CalibracionList } from './CalibracionList';
import { useCalibracionesEquipo } from './useCalibracionesEquipo';
import type { Calibracion, CalibracionInput } from './types';

interface CalibracionesEquipoProps {
  equipoId: number;
  periodicidadDias?: number | null;
  onCambio?: () => void;
}

type ModoVista = 'listado' | 'crear' | 'editar' | 'eliminar';

function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Sin fecha';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function CalibracionesEquipo({
  equipoId,
  periodicidadDias,
  onCambio,
}: CalibracionesEquipoProps) {
  const { calibraciones, loading, error, guardar, eliminar } =
    useCalibracionesEquipo(equipoId);

  const [modo, setModo] = useState<ModoVista>('listado');
  const [calibracionSeleccionada, setCalibracionSeleccionada] =
    useState<Calibracion | null>(null);

  const handleNuevoClick = () => {
    setCalibracionSeleccionada(null);
    setModo('crear');
  };

  const handleEditarClick = (calibracion: Calibracion) => {
    setCalibracionSeleccionada(calibracion);
    setModo('editar');
  };

  const handleEliminarClick = (calibracion: Calibracion) => {
    setCalibracionSeleccionada(calibracion);
    setModo('eliminar');
  };

  const handleGuardar = async (datos: CalibracionInput) => {
    await guardar(datos, calibracionSeleccionada?.id);
    volverAlListado();
    onCambio?.();
  };

  const handleConfirmarEliminar = async (id: number) => {
    await eliminar(id);
    volverAlListado();
    onCambio?.();
  };

  const volverAlListado = () => {
    setCalibracionSeleccionada(null);
    setModo('listado');
  };

  return (
    <>
      {modo !== 'eliminar' && (
        <CalibracionList
          calibraciones={calibraciones}
          loading={loading}
          error={error}
          formatearFecha={formatearFecha}
          onNuevoClick={handleNuevoClick}
          onEditarClick={handleEditarClick}
          onEliminarClick={handleEliminarClick}
        />
      )}

      <Modal
        show={modo === 'crear' || modo === 'editar'}
        onHide={volverAlListado}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {modo === 'editar' ? 'Modificar calibración' : 'Registrar calibración'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CalibracionForm
            calibracionInicial={calibracionSeleccionada}
            periodicidadDias={periodicidadDias}
            onGuardar={handleGuardar}
            onCancelar={volverAlListado}
          />
        </Modal.Body>
      </Modal>

      {modo === 'eliminar' && calibracionSeleccionada && (
        <CalibracionDeleteView
          calibracion={calibracionSeleccionada}
          formatearFecha={formatearFecha}
          onConfirmarEliminar={handleConfirmarEliminar}
          onCancelar={volverAlListado}
        />
      )}
    </>
  );
}
