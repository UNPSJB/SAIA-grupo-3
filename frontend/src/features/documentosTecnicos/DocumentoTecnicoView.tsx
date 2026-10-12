import { useAuth } from '../../shared/hooks/useAuth';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, Form, Modal } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { descargarVersion, getDocumentoTecnico, visualizarVersion } from './documentoTecnicoApi';
import {
  TIPOS_DOCUMENTO_TECNICO,
  COLORES_DOCUMENTO_TECNICO,
  type DocumentoTecnico,
  type TipoDocumentoTecnico,
  type VersionDocumentoTecnico,
} from './types';

// DEUDA TÉCNICA: duplicada en DocumentoTecnicoList.tsx
function etiquetaTipo(tipo: TipoDocumentoTecnico): string {
  return TIPOS_DOCUMENTO_TECNICO.find((t) => t.value === tipo)?.label ?? tipo;
}

// DEUDA TÉCNICA: duplicada en DocumentoTecnicoList.tsx
function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

export function DocumentoTecnicoView({
  documentoId,
  onVolver,
  onEditar,
}: DocumentoTecnicoViewProps) {
  const { currentUser } = useAuth();
  
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false); 
  const [versionHistorialElegida, setVersionHistorialElegida] = useState(''); 

  const [documento, setDocumento] = useState<DocumentoTecnico | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let componenteActivo = true;
    getDocumentoTecnico(documentoId)
      .then((data) => {
        if (componenteActivo) setDocumento(data);
      })
      .catch((err: unknown) => {
        if (componenteActivo)
          setError(err instanceof Error ? err.message : 'Error al cargar el documento.');
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

  const handleVisualizar = async (version: VersionDocumentoTecnico) => {
    try {
      await visualizarVersion(version);
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'No se pudo visualizar el archivo.');
    }
  };
  
  const esVisualizable = (nombreOriginal: string) => {
    const extension = nombreOriginal.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'pdf'].includes(extension || '');
  };

  if (error) {
    return (
      <>
        <ErrorAlert mensaje={error} />
        <Button variant="secondary" onClick={onVolver}>
          Volver
        </Button>
      </>
    );
  }
  if (!documento) return <LoadingSpinner mensaje="Cargando documento..." />;

  const vigente = documento.version_vigente;

  return (
    <>
      <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '800px' }}>
        <Card.Header className="bg-light text-secondary d-flex flex-wrap align-items-center gap-2 py-3">
          <i className="bi bi-file-earmark-text fs-5"></i>
          <h5 className="mb-0 flex-grow-1">{documento.nombre}</h5>
          <Badge
            bg={COLORES_DOCUMENTO_TECNICO[documento.tipo]}
            text={
              documento.tipo === 'ficha_tecnica' || documento.tipo === 'procedimiento'
                ? 'dark'
                : 'white'
            }
          >
            {etiquetaTipo(documento.tipo)}
          </Badge>
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
                  Cargada el {formatearFecha(vigente.fecha_subida)} por{' '}
                  {vigente.subido_por.apellido}, {vigente.subido_por.nombre}
                </small>
                {documento.vigencia_actual ? (
                  <>
                    <small className="text-muted d-block">
                      Vigente desde {formatearFecha(documento.vigencia_actual.fecha_vigencia)}
                    </small>
                    <small className="text-muted d-block">
                      Marcada por {documento.vigencia_actual.personal.apellido},{' '}
                      {documento.vigencia_actual.personal.nombre}
                    </small>
                  </>
                ) : (
                  <small className="text-muted d-block">Vigencia: sin registro previo.</small>
                )}
                {vigente.comentario && (
                  <small className="text-muted d-block fst-italic">"{vigente.comentario}"</small>
                )}
              </div>

              <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
                {esVisualizable(vigente.nombre_original) && (
                  <Button variant="primary" size="sm" onClick={() => void handleVisualizar(vigente)}>
                    <i className="bi bi-eye me-1"></i>Ver
                  </Button>
                )}
                <Button variant="primary" size="sm" onClick={() => void handleDescargar(vigente)}>
                  <i className="bi bi-download me-1"></i>Descargar
                </Button>
              </div>

            </div>
          ) : (
            <p className="text-muted">Este documento no tiene un archivo vigente.</p>
          )}
        </Card.Body>
        <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
          
          {currentUser?.administrar && documento.versiones.length > 0 && (
            <Button 
              variant="info" 
              className="text-white me-auto" 
              onClick={() => {
                setVersionHistorialElegida('');
                setMostrarModalHistorial(true);
              }}
            >
              <i className="bi bi-clock-history me-1"></i>Ver historial
            </Button>
          )}

          <Button variant="secondary" onClick={onVolver}>
            Volver
          </Button>
          <Button variant="warning" className="text-white" onClick={() => onEditar(documento)}>
            Editar
          </Button>
        </Card.Footer>
      </Card>

      <Modal
        show={mostrarModalHistorial}
        onHide={() => {
          setMostrarModalHistorial(false);
          setVersionHistorialElegida('');
        }}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Historial de Versiones</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="select-historial-versiones">
            <Form.Label>Seleccione una versión para consultar la trazabilidad</Form.Label>
            <Form.Select
              value={versionHistorialElegida}
              onChange={(e) => setVersionHistorialElegida(e.target.value)}
            >
              <option value="">Desplegar versiones anteriores...</option>
              {documento.versiones.map((version) => (
                <option key={version.id} value={version.id}>
                  Versión {version.numero} · Subida el {formatearFecha(version.fecha_subida)} {version.estado === 'vigente' ? '(Vigente actual)' : '(Archivada)'}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {versionHistorialElegida && (
            <div className="mt-4 p-4 bg-light border rounded">
              {(() => {
                const vSelec = documento.versiones.find((v) => v.id === Number(versionHistorialElegida));
                if (!vSelec) return null;
                return (
                  <>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-bold mb-0">
                        Detalles de la Versión <Badge bg={vSelec.estado === 'vigente' ? 'success' : 'secondary'}>{vSelec.numero}</Badge>
                      </h6>
                      <Badge bg={vSelec.estado === 'vigente' ? 'success' : 'secondary'}>
                        {vSelec.estado.toUpperCase()}
                      </Badge>
                    </div>
                    <small className="text-muted d-block mb-1">
                      <strong>Archivo:</strong> {vSelec.nombre_original} ({formatearTamanio(vSelec.tamanio_bytes)})
                    </small>
                    <small className="text-muted d-block mb-1">
                      <strong>Subido por:</strong> {vSelec.subido_por.apellido}, {vSelec.subido_por.nombre}
                    </small>
                    <small className="text-muted d-block mb-1">
                      <strong>Fecha de subida:</strong> {formatearFecha(vSelec.fecha_subida)}
                    </small>
                    {vSelec.comentario && (
                      <small className="text-muted d-block fst-italic mt-2">
                        <strong>Nota:</strong> "{vSelec.comentario}"
                      </small>
                    )}
                    
                    <div className="mt-4 d-flex justify-content-end align-items-center gap-2">
                      {esVisualizable(vSelec.nombre_original) && (
                       <Button variant="primary" onClick={() => void handleVisualizar(vSelec)} style={{ width: 'auto' }}>
                          <i className="bi bi-eye me-1"></i>Ver
                        </Button>
                      )}
                      <Button variant="primary" onClick={() => void handleDescargar(vSelec)} style={{ width: 'auto' }}>
                        <i className="bi bi-download me-1"></i>Descargar esta versión
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setMostrarModalHistorial(false);
            setVersionHistorialElegida('');
          }}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}