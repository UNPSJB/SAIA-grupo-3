import { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { EquipoList } from './EquipoList';
import { EquipoForm } from './EquipoForm';
import { EquipoView } from './EquipoView';
import { EquipoDeleteView } from './EquipoDeleteView';
import { useEquipo } from './useEquipo';
import { getEquipoById } from './equipoApi'; 
import type { Equipo } from './types';

type ModoVista = 'ver' | 'listado' | 'crear' | 'editar' | 'eliminar';

export function EquipoPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<ModoVista>('listado');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<Equipo | null>(null);
  const { guardar, eliminar } = useEquipo(); 
  const [sectorOrigen, setSectorOrigen] = useState<number | null>(null);
  const location = useLocation();

useEffect(() => {
    if (location.state?.equipoIdSeleccionado) {

      if (location.state.sectorDeOrigenId) {
        setSectorOrigen(location.state.sectorDeOrigenId);
      }

      const buscarEquipo = async () => {
        try {
          const equipoCompleto = await getEquipoById(location.state.equipoIdSeleccionado);
          setEquipoSeleccionado(equipoCompleto);
          setModo('ver');
          
          window.history.replaceState({}, document.title);
        } catch (error) {
          alert('Error al cargar los detalles del equipo.');
        }
      };
      
      buscarEquipo();
    }
  }, [location.state]);

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
    handleVolver();
  };

  const handleConfirmarBaja = async (id: number) => {
    await eliminar(id);
    handleVolver();
  };

const handleVolver = () => {
    if (sectorOrigen) {
      navigate('/sectores', { state: { sectorIdSeleccionado: sectorOrigen } });
    } else {
      setModo('listado');
      setEquipoSeleccionado(null);
    }
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">
        Gestión de Equipos e Instrumentos
      </h2>

      {modo === 'ver' && equipoSeleccionado && (
        <EquipoView
          equipo={equipoSeleccionado}
          onEditar={() => handleEditar(equipoSeleccionado)}
          onVolver={handleVolver}
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
          onCancelar={handleVolver}
        />
      )}

      {modo === 'eliminar' && equipoSeleccionado && equipoSeleccionado.id !== undefined && (
        <EquipoDeleteView
          equipo={equipoSeleccionado}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={handleVolver}
        />
      )}
    </Container>
  );
}