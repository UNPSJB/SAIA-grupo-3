import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { EquipoList } from './EquipoList';
import { EquipoForm } from './EquipoForm';
import { EquipoView } from './EquipoView';
import { EquipoDeleteView } from './EquipoDeleteView';
import { useEquipo } from './useEquipo';
import type { Equipo } from './types';

type ModoVista = 'ver' | 'listado' | 'crear' | 'editar' | 'eliminar';

export function EquipoPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<Equipo | null>(null);
  const { guardar, eliminar } = useEquipo();

  const handleNuevo = () => {
    setEquipoSeleccionado(null);
    setModo('crear');
  };

  const handleView = (equipo: Equipo) => {
    setEquipoSeleccionado(equipo);
    setModo('ver');
  };

  const handleEditar = (equipo: Equipo) => {
    setEquipoSeleccionado(equipo);
    setModo('editar');
  };

  const handleEliminarClick = (equipo: Equipo) => {
    setEquipoSeleccionado(equipo);
    setModo('eliminar');
  };

  const handleGuardar = async (datos: Equipo) => {
    if (modo === 'editar' && equipoSeleccionado?.id) {
      await guardar(datos, equipoSeleccionado.id);
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
    setEquipoSeleccionado(null);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Equipos e Instrumentos</h2>

      {modo === 'ver' && equipoSeleccionado && (
        <EquipoView
          equipo={equipoSeleccionado}
          onEditar={() => handleEditar(equipoSeleccionado)}
          onVolver={volverAlListado}
        />
      )}

      {modo === 'listado' && (
        <EquipoList
          onViewClick={handleView}
          onNuevoClick={handleNuevo}
          onEditarClick={handleEditar}
          onEliminarClick={handleEliminarClick}
        />
      )}

      {(modo === 'crear' || modo === 'editar') && (
        <EquipoForm
          equipoInicial={equipoSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={volverAlListado}
        />
      )}

      {modo === 'eliminar' && equipoSeleccionado && equipoSeleccionado.id !== undefined && (
        <EquipoDeleteView
          equipo={equipoSeleccionado}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={volverAlListado}
        />
      )}
    </Container>
  );
}