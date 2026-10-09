import { useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import {
  actualizarDocumentoTecnico,
  crearDocumentoTecnico,
  subirNuevaVersion,
  getDocumentoTecnico,
} from './documentoTecnicoApi';
import {
  TIPOS_DOCUMENTO_TECNICO,
  type DocumentoTecnico,
  type DocumentoTecnicoDatos,
  type DocumentoTecnicoResumen,
  type TipoDocumentoTecnico,
  type VersionDocumentoTecnico,
} from './types';

// Mismos formatos y tamaño que valida el backend (documentoTecnico/constants.py)
const EXTENSIONES_PERMITIDAS = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';
const TAMANIO_MAXIMO_BYTES = 10 * 1024 * 1024;

function validarArchivo(archivo: File | null): string | null {
  if (!archivo) return 'Debe seleccionar un archivo.';
  if (archivo.size > TAMANIO_MAXIMO_BYTES) return 'El archivo supera el tamaño máximo de 10 MB.';
  return null;
}

interface DocumentoTecnicoFormProps {
  documentoInicial: DocumentoTecnicoResumen | null; // null = crear
  onGuardado: (documento: DocumentoTecnico) => void;
  onCancelar: () => void;
}

export function DocumentoTecnicoForm({
  documentoInicial,
  onGuardado,
  onCancelar,
}: DocumentoTecnicoFormProps) {
  const [nombre, setNombre] = useState(documentoInicial?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoDocumentoTecnico>(documentoInicial?.tipo ?? 'manual_bpm');
  const [descripcion, setDescripcion] = useState(documentoInicial?.descripcion ?? '');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo en edición: archivo vigente y modal "Cargar nuevo documento"
  const [versionVigente, setVersionVigente] = useState<VersionDocumentoTecnico | null>(
    documentoInicial?.version_vigente ?? null,
  );
  const [siguienteVersion, setSiguienteVersion] = useState<number | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null);
  const [comentario, setComentario] = useState('');
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const handleSubmit = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError(null);

    // Al crear, el archivo es obligatorio (será la versión 1)
    if (!documentoInicial) {
      const errorArchivo = validarArchivo(archivo);
      if (errorArchivo) {
        setError(errorArchivo);
        return;
      }
    }

    const datos: DocumentoTecnicoDatos = {
      nombre: nombre.trim(),
      tipo,
      descripcion: descripcion.trim() || null,
    };

    setEnviando(true);
    try {
      const guardado = documentoInicial
        ? await actualizarDocumentoTecnico(documentoInicial.id, datos)
        : await crearDocumentoTecnico(datos, archivo as File); // ya validado arriba
      onGuardado(guardado);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el documento.');
      setEnviando(false);
    }
  };

  const abrirModal = async () => {
    setArchivoNuevo(null);
    setComentario('');
    setErrorModal(null);
    setSiguienteVersion(null);
    setMostrarModal(true);
    if (!documentoInicial) return;
    try {
      const actualizado = await getDocumentoTecnico(documentoInicial.id);
      setVersionVigente(actualizado.version_vigente);
      setSiguienteVersion(Math.max(0, ...actualizado.versiones.map((v) => v.numero)) + 1);
    } catch (err: unknown) {
      setErrorModal(err instanceof Error ? err.message : 'No se pudieron consultar las versiones.');
    }
  };

  const handleSubirVersion = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    evento.stopPropagation(); // que no dispare también el submit del formulario principal
    if (!documentoInicial) return;

    const errorArchivo = validarArchivo(archivoNuevo);
    if (errorArchivo) {
      setErrorModal(errorArchivo);
      return;
    }

    setSubiendo(true);
    setErrorModal(null);
    try {
      const actualizado = await subirNuevaVersion(
        documentoInicial.id,
        archivoNuevo as File,
        comentario,
      );
      setVersionVigente(actualizado.version_vigente);
      setSiguienteVersion(Math.max(0, ...actualizado.versiones.map((v) => v.numero)) + 1);
      setMensajeExito(
        `Se cargó la versión v${actualizado.version_vigente?.numero}. La anterior quedó archivada.`,
      );
      setMostrarModal(false);
    } catch (err: unknown) {
      setErrorModal(err instanceof Error ? err.message : 'No se pudo cargar el nuevo documento.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <>
      <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: '700px' }}>
        <Card.Header as="h5" className="bg-light text-secondary py-3">
          {documentoInicial ? 'Modificar documento técnico' : 'Nuevo documento técnico'}
        </Card.Header>
        <Card.Body className="p-4">
          {error && <ErrorAlert mensaje={error} />}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                required
                maxLength={150}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej.: Manual de BPM - Cocina central"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tipo</Form.Label>
              <Form.Select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoDocumentoTecnico)}
              >
                {TIPOS_DOCUMENTO_TECNICO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                Descripción <span className="text-muted small">(opcional)</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                maxLength={500}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </Form.Group>

            {documentoInicial ? (
              <div className="border rounded p-3 mb-4 bg-light">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <div className="fw-semibold">
                      Archivo vigente{' '}
                      {versionVigente && <Badge bg="secondary">v{versionVigente.numero}</Badge>}
                    </div>
                    <small className="text-muted">
                      {versionVigente ? versionVigente.nombre_original : 'Sin archivo cargado'}
                    </small>
                  </div>
                  <Button type="button" variant="outline-success" size="sm" onClick={abrirModal}>
                    <i className="bi bi-upload me-1"></i>Cargar nuevo documento
                  </Button>
                </div>
                {mensajeExito && (
                  <Alert variant="success" className="small mt-3 mb-0">
                    {mensajeExito}
                  </Alert>
                )}
              </div>
            ) : (
              <Form.Group className="mb-4">
                <Form.Label>Archivo (versión 1)</Form.Label>
                <Form.Control
                  type="file"
                  required
                  accept={EXTENSIONES_PERMITIDAS}
                  onChange={(e) => setArchivo((e.target as HTMLInputElement).files?.[0] ?? null)}
                />
                <Form.Text muted>PDF, Word, Excel, JPG o PNG. Máximo 10 MB.</Form.Text>
              </Form.Group>
            )}

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={enviando}>
                {enviando ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Modal fuera del <Form> principal: un form no puede ir dentro de otro */}
      <Modal show={mostrarModal} onHide={() => setMostrarModal(false)} centered>
        <Form onSubmit={handleSubirVersion}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-5">Cargar nuevo documento</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {errorModal && <ErrorAlert mensaje={errorModal} />}
            <p className="small text-muted">
              {siguienteVersion ? (
                <>
                  Se guardará como <strong>v{siguienteVersion}</strong>.
                </>
              ) : (
                'Consultando el número de la próxima versión...'
              )}
              {versionVigente && (
                <>
                  {' '}
                  La versión actual (v{versionVigente.numero}) quedará archivada automáticamente.
                </>
              )}
            </p>
            <Form.Group className="mb-3">
              <Form.Label>Archivo</Form.Label>
              <Form.Control
                type="file"
                required
                accept={EXTENSIONES_PERMITIDAS}
                onChange={(e) => setArchivoNuevo((e.target as HTMLInputElement).files?.[0] ?? null)}
              />
              <Form.Text muted>PDF, Word, Excel, JPG o PNG. Máximo 10 MB.</Form.Text>
            </Form.Group>
            <Form.Group>
              <Form.Label>
                ¿Qué cambió? <span className="text-muted small">(opcional)</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                maxLength={500}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ej.: Se actualizó el punto 4.2 de higiene de manos"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setMostrarModal(false)} disabled={subiendo}>
              Cancelar
            </Button>
            <Button
              variant="success"
              type="submit"
              disabled={subiendo || siguienteVersion === null}
            >
              {subiendo ? 'Cargando...' : 'Cargar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
