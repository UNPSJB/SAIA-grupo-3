import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { PersonalView } from './PersonalView';
import { PersonalList } from './PersonalList';
import { PersonalForm } from './PersonalForm';
import { PersonalDeleteView } from './PersonalDeleteView';
import { usePersonal } from './usePersonal';
import type {
  Personal,
  PersonalCreateInput,
  PersonalUpdateInput,
} from './types';

type ModoVista = 'ver' | 'listado' | 'crear' | 'editar' | 'eliminar';

export function PersonalPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [personalSeleccionado, setPersonalSeleccionado] =
    useState<Personal | null>(null);

  const { guardar, eliminar } = usePersonal();

  const volverAlListado = () => {
    setModo('listado');
    setPersonalSeleccionado(null);
  };

  const handleNuevo = () => {
    setPersonalSeleccionado(null);
    setModo('crear');
  };

  const handleView = (personal: Personal) => {
    setPersonalSeleccionado(personal);
    setModo('ver');
  };

  const handleEditar = (personal: Personal) => {
    setPersonalSeleccionado(personal);
    setModo('editar');
  };

  const handleEliminarClick = (personal: Personal) => {
    setPersonalSeleccionado(personal);
    setModo('eliminar');
  };

  const handleGuardar = async (
    datos: PersonalCreateInput | PersonalUpdateInput
  ) => {
    if (modo === 'editar' && personalSeleccionado) {
      await guardar(datos, personalSeleccionado.id);
    } else {
      await guardar(datos);
    }

    volverAlListado();
  };

  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    volverAlListado();
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">
        Gestión de Personal
      </h2>

      {modo === 'ver' && personalSeleccionado && (
        <PersonalView
          personal={personalSeleccionado}
          onEditar={() => handleEditar(personalSeleccionado)}
          onVolver={volverAlListado}
        />
      )}

      {modo === 'listado' && (
        <PersonalList
          onViewClick={handleView}
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