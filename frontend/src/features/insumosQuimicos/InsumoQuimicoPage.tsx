import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { InsumoQuimicoView } from './InsumoQuimicoView';
import { InsumoQuimicoList } from './InsumoQuimicoList';
import { InsumoQuimicoForm } from './InsumoQuimicoForm';
import { InsumoQuimicoDeleteView } from './InsumoQuimicoDeleteView';
import { useInsumoQuimico } from './useInsumoQuimico';
import type { InsumoQuimico, InsumoQuimicoCreate } from './types';

type ModoVista = 'ver' | 'listado' | 'crear' | 'editar' | 'eliminar';

export function InsumoQuimicoPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<InsumoQuimico | null>(null);
  const { guardar, eliminar } = useInsumoQuimico();

  const handleNuevo = () => {
    setInsumoSeleccionado(null);
    setModo('crear');
  };

  const handleView = (insumo: InsumoQuimico) => {
    setInsumoSeleccionado(insumo);
    setModo('ver');
  };

  const handleEditar = (insumo: InsumoQuimico) => {
    setInsumoSeleccionado(insumo);
    setModo('editar');
  };

  const handleEliminarClick = (insumo: InsumoQuimico) => {
    setInsumoSeleccionado(insumo);
    setModo('eliminar');
  };

  const handleGuardar = async (datos: InsumoQuimicoCreate) => {
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
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Insumos Químicos</h2>

      {modo === 'ver' && insumoSeleccionado && (
        <InsumoQuimicoView
          insumo={insumoSeleccionado}
          onEditar={() => handleEditar(insumoSeleccionado)}
          onVolver={volverAlListado}
        />
      )}

      {modo === 'listado' && (
        <InsumoQuimicoList
          onViewClick={handleView}
          onNuevoClick={handleNuevo}
          onEditarClick={handleEditar}
          onEliminarClick={handleEliminarClick}
        />
      )}

      {(modo === 'crear' || modo === 'editar') && (
        <InsumoQuimicoForm
          insumoInicial={insumoSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={volverAlListado}
        />
      )}

      {modo === 'eliminar' && insumoSeleccionado && (
        <InsumoQuimicoDeleteView
          insumo={insumoSeleccionado}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={volverAlListado}
        />
      )}
    </Container>
  );
}