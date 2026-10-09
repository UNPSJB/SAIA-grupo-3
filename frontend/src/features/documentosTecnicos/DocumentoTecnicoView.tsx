import { useEffect, useState } from 'react';
import { Badge, Button, Card } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { descargarVersion, getDocumentoTecnico } from './documentoTecnicoApi';
import {
  TIPOS_DOCUMENTO_TECNICO,
  type DocumentoTecnico, type TipoDocumentoTecnico, type VersionDocumentoTecnico,
} from './types';

// DEUDA TÉCNICA: duplicada en DocumentoTecnicoList.tsx
function etiquetaTipo(tipo: TipoDocumentoTecnico): string {
  return TIPOS_DOCUMENTO_TECNICO.find((t) => t.value === tipo)?.label ?? tipo;
}

// DEUDA TÉCNICA: duplicada en DocumentoTecnicoList.tsx
function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatearTamanio(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentoTecnicoViewProps {
  documentoId: number;
  onVolver: () => void;
  onEditar: (documento: DocumentoTecnico) => void;
}

export function DocumentoTecnicoView({ documentoId, onVolver, onEditar }: DocumentoTecnicoViewProps) {
  const [documento, setDocumento] = useState<DocumentoTecnico | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let componenteActivo = true;
    getDocumentoTecnico(documentoId)
      .then((data) => {
        if (componenteActivo) setDocumento(data);
      })
      .catch((err: unknown) => {
        if (componenteActivo) setError(err instanceof Error ? err.message : 'Error al cargar el documento.');
      });
    return () => {
      componenteActivo = false;
    };
  }, [documentoId]);

  const handleDescargar = async (version: VersionDocumentoTecnico) => {
    try {
      await descargarVersion(version);
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'No se pudo descargar el archivo.');
    }
  };

  if (error) {
    return (
      <>
        <ErrorAlert mensaje={error} />
        <Button variant="secondary" onClick={onVolver}>Volver</Button>
      </>
    );
  }
  if (!documento) return <LoadingSpinner mensaje="Cargando documento..." />;

  const vigente = documento.version_vigente;

  return (
    <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '800px' }}>
      <Card.Header className="bg-light text-secondary d-flex flex-wrap align-items-center gap-2 py-3">
        <i className="bi bi-file-earmark-text fs-5"></i>
        <h5 className="mb-0 flex-grow-1">{documento.nombre}</h5>
        <Badge bg="info" className="text-dark">{etiquetaTipo(documento.tipo)}</Badge>
      </Card.Header>

      <Card.Body className="p-4">
        {documento.descripcion && <p className="text-muted">{documento.descripcion}</p>}

        {vigente ? (
          <div className="bg-light p-3 rounded border d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <div className="fw-semibold">
                Versión vigente <Badge bg="secondary">v{vigente.numero}</Badge>
              </div>
              <small className="text-muted d-block">
                {vigente.nombre_original} · {formatearTamanio(vigente.tamanio_bytes)}
              </small>
              <small className="text-muted d-block">
                Cargada el {formatearFecha(vigente.fecha_subida)} por {vigente.subido_por.apellido}, {vigente.subido_por.nombre}
              </small>
              {vigente.comentario && (
                <small className="text-muted d-block fst-italic">"{vigente.comentario}"</small>
              )}
            </div>
            <Button variant="primary" size="sm" onClick={() => void handleDescargar(vigente)}>
              <i className="bi bi-download me-1"></i>Descargar
            </Button>
          </div>
        ) : (
          <p className="text-muted">Este documento no tiene un archivo vigente.</p>
        )}
      </Card.Body>

      <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
        <Button variant="secondary" onClick={onVolver}>Volver</Button>
        <Button variant="warning" className="text-white" onClick={() => onEditar(documento)}>
          Editar
        </Button>
      </Card.Footer>
    </Card>
  );
}
