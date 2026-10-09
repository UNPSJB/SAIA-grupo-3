import { useAuth } from '../../shared/hooks/useAuth';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, Form, Modal } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { descargarVersion, getDocumentoTecnico, marcarVersionVigente } from './documentoTecnicoApi';
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
  const [mostrarModal, setMostrarModal] = useState(false);
  const [versionElegida, setVersionElegida] = useState('');
  const [guardandoVigencia, setGuardandoVigencia] = useState(false);
  const [errorVigencia, setErrorVigencia] = useState<string | null>(null);
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

  const confirmarVigencia = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!documento || !versionElegida || guardandoVigencia) return;
    setGuardandoVigencia(true);
    setErrorVigencia(null);
    try {
      const actualizado = await marcarVersionVigente(documento.id, Number(versionElegida));
      setDocumento(actualizado);
      setMostrarModal(false);
    } catch (err: unknown) {
      setErrorVigencia(
        err instanceof Error ? err.message : 'No se pudo cambiar la versión vigente.',
      );
    } finally {
      setGuardandoVigencia(false);
    }
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
              <Button variant="primary" size="sm" onClick={() => void handleDescargar(vigente)}>
                <i className="bi bi-download me-1"></i>Descargar
              </Button>
            </div>
          ) : (
            <p className="text-muted">Este documento no tiene un archivo vigente.</p>
          )}
        </Card.Body>

        {currentUser?.administrar &&
          documento.estado === 'vigente' &&
          documento.versiones.some((v) => v.id !== vigente?.id) && (
            <div className="d-flex justify-content-end px-4 pb-3">
              <Button
                variant="outline-success"
                onClick={() => {
                  setVersionElegida('');
                  setErrorVigencia(null);
                  setMostrarModal(true);
                }}
              >
                Cambiar versión vigente
              </Button>
            </div>
          )}
        <Card.Footer className="bg-white border-top-0 d-flex justify-content-end gap-2 pb-4 px-4">
          <Button variant="secondary" onClick={onVolver}>
            Volver
          </Button>
          <Button variant="warning" className="text-white" onClick={() => onEditar(documento)}>
            Editar
          </Button>
        </Card.Footer>
      </Card>
      <Modal
        show={mostrarModal}
        onHide={() => {
          if (!guardandoVigencia) setMostrarModal(false);
        }}
        centered
        backdrop={guardandoVigencia ? 'static' : true}
        keyboard={!guardandoVigencia}
      >
        <Form onSubmit={confirmarVigencia}>
          <Modal.Header closeButton={!guardandoVigencia}>
            <Modal.Title className="fs-5">Cambiar versión vigente</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {errorVigencia && <ErrorAlert mensaje={errorVigencia} />}
            <Form.Group controlId="version-vigente-documento">
              <Form.Label>Versión que corresponde seguir</Form.Label>
              <Form.Select
                required
                value={versionElegida}
                disabled={guardandoVigencia}
                onChange={(e) => setVersionElegida(e.target.value)}
              >
                <option value="">Seleccionar versión</option>
                {documento.versiones.map((version) => (
                  <option key={version.id} value={version.id} disabled={version.id === vigente?.id}>
                    v{version.numero} · {version.nombre_original} ·{' '}
                    {formatearFecha(version.fecha_subida)}
                    {version.id === vigente?.id ? ' (vigente actual)' : ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <p className="small text-muted mt-3 mb-0">
              {vigente ? `La versión actual (v${vigente.numero}) quedará archivada. ` : ''}
              Se registrarán tu usuario y la fecha y hora del cambio. Los archivos se conservarán.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              disabled={guardandoVigencia}
              onClick={() => setMostrarModal(false)}
            >
              Cancelar
            </Button>
            <Button variant="success" type="submit" disabled={!versionElegida || guardandoVigencia}>
              {guardandoVigencia ? 'Guardando...' : 'Marcar vigente'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
