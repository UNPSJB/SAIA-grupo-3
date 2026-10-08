import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { VencimientosList } from './VencimientosList';
import { PersonalView } from './PersonalView';
import { PersonalForm } from './PersonalForm';
import { getPersonalByDni, updatePersonal } from './personalApi';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Personal, Vencimiento } from './types';

type ModoVista = 'listado' | 'ver' | 'editar';

export function VencimientosPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [personalSeleccionado, setPersonalSeleccionado] = useState<Personal | null>(null);
  const [cargandoLegajo, setCargandoLegajo] = useState(false);
  const [errorLegajo, setErrorLegajo] = useState<string | null>(null);

  
  const handleVerLegajo = async (vencimiento: Vencimiento) => {
    setCargandoLegajo(true);
    setErrorLegajo(null);
    try {
      const personal = await getPersonalByDni(vencimiento.personal.dni);
      setPersonalSeleccionado(personal);
      setModo('ver');
    } catch (err: unknown) {
      setErrorLegajo(err instanceof Error ? err.message : 'No se pudo abrir el legajo.');
    } finally {
      setCargandoLegajo(false);
    }
  };

  const handleGuardar = async (datos: Personal) => {
    if (!personalSeleccionado) return;
    await updatePersonal(personalSeleccionado.dni, datos);
    const actualizado = await getPersonalByDni(personalSeleccionado.dni);
    setPersonalSeleccionado(actualizado);
    setModo('ver');
  };

  const volverAlListado = () => {
    setModo('listado');
    setPersonalSeleccionado(null);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Control de Vencimientos</h2>

      {modo === 'listado' && (
        <>
          {errorLegajo && <ErrorAlert mensaje={errorLegajo} />}
          {cargandoLegajo && <LoadingSpinner mensaje="Abriendo legajo..." />}
          <VencimientosList onVerLegajo={handleVerLegajo} />
        </>
      )}

      {modo === 'ver' && personalSeleccionado && (
        <PersonalView
          personal={personalSeleccionado}
          onEditar={() => setModo('editar')}
          onVolver={volverAlListado}
        />
      )}

      {modo === 'editar' && personalSeleccionado && (
        <PersonalForm
          personalInicial={personalSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={() => setModo('ver')}
        />
      )}
    </Container>
  );
}
