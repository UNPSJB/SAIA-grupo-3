import { useState } from 'react';
import { Container } from 'react-bootstrap';
import { DocumentoTecnicoList } from './DocumentoTecnicoList';
import { DocumentoTecnicoForm } from './DocumentoTecnicoForm';
import { DocumentoTecnicoView } from './DocumentoTecnicoView';
import type { DocumentoTecnicoResumen } from './types';

type ModoVista = 'listado' | 'crear' | 'editar' | 'ver';

export function DocumentoTecnicoPage() {

  const [modo, setModo] = useState<ModoVista>('listado');
  const [seleccionado, setSeleccionado] = useState<DocumentoTecnicoResumen | null>(null);

  const verDocumento = (documento: DocumentoTecnicoResumen) => {
    setSeleccionado(documento);
    setModo('ver');
  };

  const editarDocumento = (documento: DocumentoTecnicoResumen) => {
    setSeleccionado(documento);
    setModo('editar');
  };

  const nuevoDocumento = () => {
    setSeleccionado(null);
    setModo('crear');
  };

  const volverAlListado = () => {
    setSeleccionado(null);
    setModo('listado');
  };

  return (
    <Container className="py-2">
      <h2 className="mb-4 border-bottom pb-2 text-secondary">Documentos Técnicos</h2>

      {modo === 'listado' && (
        <DocumentoTecnicoList
          onNuevo={nuevoDocumento}
          onVer={verDocumento}
          onEditar={editarDocumento}
        />
      )}

      {(modo === 'crear' || modo === 'editar') && (
        <DocumentoTecnicoForm
          key={seleccionado?.id ?? 'nuevo'}
          documentoInicial={modo === 'editar' ? seleccionado : null}
          onGuardado={verDocumento}                      // al guardar, se muestra el detalle
          onCancelar={modo === 'editar' ? () => setModo('ver') : volverAlListado}
        />
      )}

      {modo === 'ver' && seleccionado && (
        <DocumentoTecnicoView
          key={seleccionado.id}
          documentoId={seleccionado.id}
          onVolver={volverAlListado}
          onEditar={editarDocumento}
        />
      )}
    </Container>
  );
}
