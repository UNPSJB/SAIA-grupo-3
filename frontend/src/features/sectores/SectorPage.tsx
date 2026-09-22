import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { SectorList } from './SectorList';
import { SectorForm } from './SectorForm';
import { SectorView } from './SectorView';
import { SectorDeleteView } from './SectorDeleteView';
import { getSectorById } from './sectorApi';
import { useSector } from './useSector';
import type { Sector } from './types';

type ModoVista = 'ver' | 'listado' | 'crear' | 'editar' | 'eliminar';

export function SectorPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [sectorSeleccionado, setSectorSeleccionado] = useState<Sector | null>(null);
  const { guardar, eliminar } = useSector();

  const handleNuevo = () => {
    setSectorSeleccionado(null);
    setModo('crear');
  };

const handleView = async (sector: Sector) => {
    if (sector.id !== undefined) {
      try {
        // Vamos al backend a buscar el sector completo con sus equipos anidados
        const sectorCompleto = await getSectorById(sector.id);
        setSectorSeleccionado(sectorCompleto);
        setModo('ver');
      } catch (err) {
        alert('Error al cargar los detalles del sector.');
      }
    }
  };

  const handleEditar = (sector: Sector) => {
    setSectorSeleccionado(sector);
    setModo('editar');
  };

  const handleEliminarClick = (sector: Sector) => {
    setSectorSeleccionado(sector);
    setModo('eliminar');
  };

  const handleGuardar = async (datos: Sector) => {
    if (modo === 'editar' && sectorSeleccionado?.id) {
      await guardar(datos, sectorSeleccionado.id);
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
    setSectorSeleccionado(null);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">
        Gestión de Sectores
      </h2>

      {modo === 'ver' && sectorSeleccionado && (
        <SectorView
          sector={sectorSeleccionado}
          onEditar={() => handleEditar(sectorSeleccionado)}
          onVolver={volverAlListado}
        />
      )}

      {modo === 'listado' && (
        <SectorList
          onViewClick={handleView}
          onNuevoClick={handleNuevo}
          onEditarClick={handleEditar}
          onEliminarClick={handleEliminarClick}
        />
      )}

      {(modo === 'crear' || modo === 'editar') && (
        <SectorForm
          sectorInicial={sectorSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={volverAlListado}
        />
      )}

      {modo === 'eliminar' && sectorSeleccionado && sectorSeleccionado.id !== undefined && (
        <SectorDeleteView
          sector={sectorSeleccionado}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={volverAlListado}
        />
      )}
    </Container>
  );
}