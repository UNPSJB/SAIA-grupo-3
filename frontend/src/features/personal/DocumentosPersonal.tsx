import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { DocumentoDeleteView } from './DocumentoDeleteView';
import { DocumentoForm } from './DocumentoForm';
import { DocumentoList } from './DocumentoList';
import { useDocumentosPersonal } from './useDocumentosPersonal';
import type { DocumentoDatos } from './documentacionApi';
import type { Documento } from './types';

interface DocumentosPersonalProps {
  personalId: number;
}

type ModoVista = 'listado' | 'crear' | 'editar' | 'eliminar';

function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Sin fecha cargada';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function DocumentosPersonal({ personalId }: DocumentosPersonalProps) {
  const {
    documentos,
    tiposDocumento,
    loading,
    error,
    guardar,
    eliminar,
  } = useDocumentosPersonal(personalId);

  const [modo, setModo] = useState<ModoVista>('listado');
  const [documentoSeleccionado, setDocumentoSeleccionado] =
    useState<Documento | null>(null);

  const handleNuevoClick = () => {
    setDocumentoSeleccionado(null);
    setModo('crear');
  };

  const handleEditarClick = (documento: Documento) => {
    setDocumentoSeleccionado(documento);
    setModo('editar');
  };

  const handleEliminarClick = (documento: Documento) => {
    setDocumentoSeleccionado(documento);
    setModo('eliminar');
  };

  const handleGuardar = async (datos: DocumentoDatos) => {
    await guardar(datos, documentoSeleccionado?.id);
    volverAlListado();
  };

  const handleConfirmarEliminar = async (id: number) => {
    await eliminar(id);
    volverAlListado();
  };

  const volverAlListado = () => {
    setDocumentoSeleccionado(null);
    setModo('listado');
  };

  return (
    <>
      {modo === 'listado' && (
        <DocumentoList
          documentos={documentos}
          loading={loading}
          error={error}
          formatearFecha={formatearFecha}
          onNuevoClick={handleNuevoClick}
          onEditarClick={handleEditarClick}
          onEliminarClick={handleEliminarClick}
        />
      )}

      <Modal
        show={modo === 'crear' || modo === 'editar'}
        onHide={volverAlListado}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {modo === 'editar' ? 'Editar o renovar documento' : 'Agregar documento'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <DocumentoForm
            documentoInicial={documentoSeleccionado}
            tiposDocumento={tiposDocumento}
            onGuardar={handleGuardar}
            onCancelar={volverAlListado}
          />
        </Modal.Body>
      </Modal>

      {modo === 'eliminar' && documentoSeleccionado && (
        <DocumentoDeleteView
          documento={documentoSeleccionado}
          onConfirmarEliminar={handleConfirmarEliminar}
          onCancelar={volverAlListado}
        />
      )}
    </>
  );
}
