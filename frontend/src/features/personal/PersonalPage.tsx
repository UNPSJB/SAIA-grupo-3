import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { PersonalList } from './PersonalList';
import { PersonalForm } from './PersonalForm';
import { PersonalDeleteView } from './PersonalDeleteView';
import { usePersonal } from './usePersonal';
import type { Personal } from './types';

type ModoVista = 'listado' | 'crear' | 'editar' | 'eliminar';

export function PersonalPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [personalSeleccionado, setPersonalSeleccionado] = useState<Personal | null>(null);
  const { guardar, eliminar } = usePersonal();

  const handleNuevo = () => {
    setPersonalSeleccionado(null);
    setModo('crear');
  };

  const handleEditar = (personal: Personal) => {
    setPersonalSeleccionado(personal);
    setModo('editar');
  };

  const handleEliminarClick = (personal: Personal) => {
    setPersonalSeleccionado(personal);
    setModo('eliminar');
  };

  const handleGuardar = async (datos: Personal) => {
    if (modo === 'editar' && personalSeleccionado) {
      await guardar(datos, personalSeleccionado.dni);
    } else {
      await guardar(datos);
    }
    volverAlListado();
  };

  const handleConfirmarBaja = async (dni: number) => {
    await eliminar(dni);
    volverAlListado();
  };

  const volverAlListado = () => {
    setModo('listado');
    setPersonalSeleccionado(null);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Personal</h2>

      {modo === 'listado' && (
        <PersonalList
          onNuevoClick={handleNuevo}
          onEditarClick={handleEditar}
          onEliminarClick={handleEliminarClick}
        />
      )}

      {(modo === 'crear' || modo === 'editar') && (
        <PersonalForm
          personalInicial={personalSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={volverAlListado}
        />
      )}

      {modo === 'eliminar' && personalSeleccionado && (
        <PersonalDeleteView
          personal={personalSeleccionado}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={volverAlListado}
        />
      )}
    </Container>
  );
}