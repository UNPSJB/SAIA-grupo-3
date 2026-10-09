import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { VencimientosList } from './VencimientosList';
import { PersonalView } from './PersonalView';
import { PersonalForm } from './PersonalForm';
import { getPersonalById, updatePersonal } from './personalApi';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { Personal, PersonalUpdateInput, Vencimiento } from './types';

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
      const personal = await getPersonalById(vencimiento.personal.id);
      setPersonalSeleccionado(personal);
      setModo('ver');
    } catch (err: unknown) {
      setErrorLegajo(err instanceof Error ? err.message : 'No se pudo abrir el legajo.');
    } finally {
      setCargandoLegajo(false);
    }
  };

  const handleGuardar = async (datos: PersonalUpdateInput) => {
    if (!personalSeleccionado) return;
    await updatePersonal(personalSeleccionado.id, datos);
    const actualizado = await getPersonalById(personalSeleccionado.id);
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
