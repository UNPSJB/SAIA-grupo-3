import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { ElementoList } from './ElementoList';
import { ElementoForm } from './ElementoForm';
import { ElementoView } from './ElementoView';
import { ElementoDeleteView } from './ElementoDeleteView';
import { useElemento } from './useElemento';
import type { Elemento } from './types';

type ModoVista = 'ver' | 'listado' | 'crear' | 'editar' | 'eliminar';

export function ElementoPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [elementoSeleccionado, setElementoSeleccionado] = useState<Elemento | null>(null);
  const { guardar, eliminar } = useElemento();

  const handleNuevo = () => {
    setElementoSeleccionado(null);
    setModo('crear');
  };

  const handleView = (elemento: Elemento) => {
    setElementoSeleccionado(elemento);
    setModo('ver');
  };

  const handleEditar = (elemento: Elemento) => {
    setElementoSeleccionado(elemento);
    setModo('editar');
  };

  const handleEliminarClick = (elemento: Elemento) => {
    setElementoSeleccionado(elemento);
    setModo('eliminar');
  };

  const handleGuardar = async (datos: Elemento) => {
    if (modo === 'editar' && elementoSeleccionado?.id) {
      await guardar(datos, elementoSeleccionado.id);
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
    setElementoSeleccionado(null);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">
        Gestión de Elementos de limpieza
      </h2>

      {modo === 'ver' && elementoSeleccionado && (
        <ElementoView
          elemento={elementoSeleccionado}
          onEditar={() => handleEditar(elementoSeleccionado)}
          onVolver={volverAlListado}
        />
      )}

      {modo === 'listado' && (
        <ElementoList
          onViewClick={handleView}
          onNuevoClick={handleNuevo}
          onEditarClick={handleEditar}
          onEliminarClick={handleEliminarClick}
        />
      )}

      {(modo === 'crear' || modo === 'editar') && (
        <ElementoForm
          key={elementoSeleccionado?.id ?? 'nuevo'}
          elementoInicial={elementoSeleccionado}
          onGuardar={handleGuardar}
          onCancelar={volverAlListado}
        />
      )}

      {modo === 'eliminar' && elementoSeleccionado && elementoSeleccionado.id !== undefined && (
        <ElementoDeleteView
          elemento={elementoSeleccionado}
          onConfirmarEliminar={handleConfirmarBaja}
          onCancelar={volverAlListado}
        />
      )}
    </Container>
  );
}