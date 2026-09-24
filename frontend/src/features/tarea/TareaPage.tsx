import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { TareaList } from './TareaList';
import { TareaForm } from './TareaForm';
import { TareaView } from './TareaView';
import { TareaDeleteView } from './TareaDeleteView';
import { useTarea } from './useTarea';
import type { Tarea, TareaCreate } from './types';

type ModoVista = 'ver' | 'listado' | 'crear' | 'editar' | 'eliminar';

export function TareaPage() {
  const [modo, setModo] = useState<ModoVista>('listado');
  const [tareaSeleccionada, setTareaSeleccionada] = useState<Tarea | null>(null);
  const { guardar, eliminar } = useTarea();

  const handleNuevo = () => { setTareaSeleccionada(null); setModo('crear'); };
  const handleView = (tarea: Tarea) => { setTareaSeleccionada(tarea); setModo('ver'); };
  const handleEditar = (tarea: Tarea) => { setTareaSeleccionada(tarea); setModo('editar'); };
  const handleEliminarClick = (tarea: Tarea) => { setTareaSeleccionada(tarea); setModo('eliminar'); };

  const handleGuardar = async (datos: TareaCreate) => {
    if (modo === 'editar' && tareaSeleccionada?.id) {
      await guardar(datos, tareaSeleccionada.id);
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
    setTareaSeleccionada(null);
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Gestión de Tareas</h2>
      {modo === 'ver' && tareaSeleccionada && <TareaView tarea={tareaSeleccionada} onEditar={() => handleEditar(tareaSeleccionada)} onVolver={volverAlListado} />}
      {modo === 'listado' && <TareaList onViewClick={handleView} onNuevoClick={handleNuevo} onEditarClick={handleEditar} onEliminarClick={handleEliminarClick} />}
      {(modo === 'crear' || modo === 'editar') && <TareaForm tareaInicial={tareaSeleccionada} onGuardar={handleGuardar} onCancelar={volverAlListado} />}
      {modo === 'eliminar' && tareaSeleccionada && tareaSeleccionada.id !== undefined && <TareaDeleteView tarea={tareaSeleccionada} onConfirmarEliminar={handleConfirmarBaja} onCancelar={volverAlListado} />}
    </Container>
  );
}