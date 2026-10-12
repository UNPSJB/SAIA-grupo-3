import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { VencimientosCalibracionList } from './VencimientosCalibracionList';
import { EquipoView } from './EquipoView';
import { EquipoForm } from './EquipoForm';
import { getEquipoById, updateEquipo } from './equipoApi';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Equipo, VencimientoCalibracion } from './types';

type ModoVista = 'listado' | 'ver' | 'editar';

export function VencimientosCalibracionPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<Equipo | null>(null);
  const [cargandoEquipo, setCargandoEquipo] = useState(false);
  const [errorEquipo, setErrorEquipo] = useState<string | null>(null);

  // "Ir al equipo": trae el equipo completo y abre su detalle (con el historial de calibraciones)
  const handleVerEquipo = async (vencimiento: VencimientoCalibracion) => {
    setCargandoEquipo(true);
    setErrorEquipo(null);
    try {
      const equipo = await getEquipoById(vencimiento.equipo.id);
      setEquipoSeleccionado(equipo);
      setModo('ver');
    } catch (err: unknown) {
      setErrorEquipo(err instanceof Error ? err.message : 'No se pudo abrir el equipo.');
    } finally {
      setCargandoEquipo(false);
    }
  };

  // Al registrar una calibración desde el detalle, el backend actualiza la última
  // calibración del equipo: la volvemos a traer para que la tarjeta quede al día.
  const refrescarEquipoSeleccionado = async () => {
    if (!equipoSeleccionado?.id) return;
    try {
      setEquipoSeleccionado(await getEquipoById(equipoSeleccionado.id));
    } catch {
      // Si falla, el detalle queda con los datos anteriores; el historial ya está actualizado.
    }
  };

  const handleGuardar = async (datos: Equipo) => {
    if (!equipoSeleccionado?.id) return;
    await updateEquipo(equipoSeleccionado.id, datos);
    setEquipoSeleccionado(await getEquipoById(equipoSeleccionado.id));
    setModo('ver');
  };

  const volverAlListado = () => {
    setModo('listado');
    setEquipoSeleccionado(null);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Control de Vencimientos</h2>

      {modo === 'listado' && (
        <>
          {errorEquipo && <ErrorAlert mensaje={errorEquipo} />}
          {cargandoEquipo && <LoadingSpinner mensaje="Abriendo equipo..." />}
          <VencimientosCalibracionList onVerEquipo={handleVerEquipo} />
        </>
      )}

      {modo === 'ver' && equipoSeleccionado && (
        <EquipoView
          equipo={equipoSeleccionado}
          onEditar={() => setModo('editar')}
          onVolver={volverAlListado}
          onCalibracionesActualizadas={refrescarEquipoSeleccionado}
        />
      )}

      {modo === 'editar' && equipoSeleccionado && (
        <EquipoForm
          equipoInicial={equipoSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={() => setModo('ver')}
        />
      )}
    </Container>
  );
}
