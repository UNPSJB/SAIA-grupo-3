import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { ProfesoresList } from './ProfesoresList';
import { ProfesorForm } from './ProfesorForm';
import { ProfesorDeleteView } from './ProfesorDeleteView';
import { useProfesores } from './useProfesores';
import type { Profesor } from './types';

type ModoVista = 'listado' | 'crear' | 'editar' | 'eliminar';

export function ProfesoresPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [profesorSeleccionado, setProfesorSeleccionado] = useState<Profesor | null>(null);
  const { guardar, eliminar } = useProfesores();

  const handleNuevo = () => {
    setProfesorSeleccionado(null);
    setModo('crear');
  };

  const handleEditar = (profesor: Profesor) => {
    setProfesorSeleccionado(profesor);
    setModo('editar');
  };

  const handleEliminarClick = (profesor: Profesor) => {
    setProfesorSeleccionado(profesor);
    setModo('eliminar');
  };

  const handleGuardar = async (datos: Omit<Profesor, 'id'>) => {
    if (modo === 'editar' && profesorSeleccionado) {
      await guardar(datos, profesorSeleccionado.id);
    } else {
      await guardar(datos);
    }
    volverAlListado();
  };

  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    volverAlListado();
  };

  const volverAlListado = () => {
    setModo('listado');
    setProfesorSeleccionado(null);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Profesores</h2>

      {modo === 'listado' && (
        <ProfesoresList
          onNuevoClick={handleNuevo}
          onEditarClick={handleEditar}
          onEliminarClick={handleEliminarClick}
        />
      )}

      {(modo === 'crear' || modo === 'editar') && (
        <ProfesorForm
          profesorInicial={profesorSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={volverAlListado}
        />
      )}

      {modo === 'eliminar' && profesorSeleccionado && (
        <ProfesorDeleteView
          profesor={profesorSeleccionado}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={volverAlListado}
        />
      )}
    </Container>
  );
}