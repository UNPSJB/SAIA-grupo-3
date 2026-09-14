import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { InsumoView } from './InsumoView';
import { InsumoList } from './InsumoList';
import { InsumoForm } from './InsumoForm';
import { InsumoDeleteView } from './InsumoDeleteView';
import { useInsumo } from './useInsumo';
import type { Insumo, InsumoCreate } from './types';

type ModoVista = 'ver' | 'listado' | 'crear' | 'editar' | 'eliminar';

export function InsumoPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<Insumo | null>(null);
  const { guardar, eliminar } = useInsumo();

  const handleNuevo = () => {
    setInsumoSeleccionado(null);
    setModo('crear');
  };
  
  const handleView = (insumo: Insumo) => {
    setInsumoSeleccionado(insumo);
    setModo('ver');
  };

  const handleEditar = (insumo: Insumo) => {
    setInsumoSeleccionado(insumo);
    setModo('editar');
  };

  const handleEliminarClick = (insumo: Insumo) => {
    setInsumoSeleccionado(insumo);
    setModo('eliminar');
  };

  const handleGuardar = async (datos: InsumoCreate) => {
    if (modo === 'editar' && insumoSeleccionado) {
      await guardar(datos, insumoSeleccionado.id);
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
    setInsumoSeleccionado(null);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Insumos</h2>

      {modo === 'ver' && insumoSeleccionado && (
        <InsumoView
          insumo={insumoSeleccionado}
          onEditar={() => handleEditar(insumoSeleccionado)}
          onVolver={volverAlListado}
        />
      )}

      {modo === 'listado' && (
        <InsumoList
          onViewClick={handleView}
          onNuevoClick={handleNuevo}
          onEditarClick={handleEditar}
          onEliminarClick={handleEliminarClick}
        />
      )}

      {(modo === 'crear' || modo === 'editar') && (
        <InsumoForm
          insumoInicial={insumoSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={volverAlListado}
        />
      )}

      {modo === 'eliminar' && insumoSeleccionado && (
        <InsumoDeleteView
          insumo={insumoSeleccionado}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={volverAlListado}
        />
      )}
    </Container>
  );
}