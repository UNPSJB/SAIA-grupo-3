import { useEffect, useState, type FormEvent } from 'react';
import { Badge, Button, Card, Form, Modal, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import {
  createDocumento,
  deleteDocumento,
  getDocumentosPersonal,
  updateDocumento,
  type DocumentoDatos,
} from './documentacionApi';
import type { Documento, TipoDocumento } from './types';
import { TIPOS_DOCUMENTO } from './types';

interface DocumentosPersonalProps {
  personalId: number;
}

function nombreTipoDocumento(tipo: TipoDocumento): string {
  return TIPOS_DOCUMENTO.find((opcion) => opcion.value === tipo)?.label ?? tipo;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Sin fecha cargada';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function DocumentosPersonal({ personalId }: DocumentosPersonalProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [personalCargadoId, setPersonalCargadoId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [documentoEditando, setDocumentoEditando] = useState<Documento | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('carnet_manipulador');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [validado, setValidado] = useState(false);

  useEffect(() => {
    let componenteActivo = true;
    getDocumentosPersonal(personalId)
      .then((datos) => {
        if (componenteActivo) {
          setDocumentos(datos);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (componenteActivo) setError(err.message);
      })
      .finally(() => {
        if (componenteActivo) setPersonalCargadoId(personalId);
      });

    return () => {
      componenteActivo = false;
    };
  }, [personalId]);

  const cargando = personalCargadoId !== personalId;

  const abrirFormulario = (documento?: Documento) => {
    setDocumentoEditando(documento ?? null);
    setNombre(documento?.nombre ?? '');
    setTipoDocumento(documento?.tipo_documento ?? 'carnet_manipulador');
    setFechaVencimiento(documento?.fecha_vencimiento ?? '');
    setValidado(false);
    setError(null);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) return;
    setMostrarFormulario(false);
    setDocumentoEditando(null);
  };

  const handleGuardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    if (!formulario.checkValidity()) {
      evento.stopPropagation();
      setValidado(true);
      return;
    }

    setGuardando(true);
    setError(null);
    const datos: DocumentoDatos = {
      nombre: nombre.trim(),
      tipo_documento: tipoDocumento,
      fecha_vencimiento: fechaVencimiento,
    };

    try {
      if (documentoEditando) {
        const actualizado = await updateDocumento(documentoEditando.id, datos);
        setDocumentos((actuales) =>
          actuales.map((documento) =>
            documento.id === actualizado.id ? actualizado : documento
          )
        );
      } else {
        const creado = await createDocumento(personalId, datos);
        setDocumentos((actuales) => [...actuales, creado]);
      }
      setMostrarFormulario(false);
      setDocumentoEditando(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el documento.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (documento: Documento) => {
    if (!window.confirm(`¿Eliminar el documento "${documento.nombre}"?`)) return;
    setError(null);
    try {
      await deleteDocumento(documento.id);
      setDocumentos((actuales) =>
        actuales.filter((actual) => actual.id !== documento.id)
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el documento.');
    }
  };

  return (
    <>
      <Card className="shadow-sm border-0 mt-4">
        <Card.Header className="bg-light text-secondary d-flex justify-content-between align-items-center gap-2 py-3">
          <h5 className="mb-0">
            <i className="bi bi-file-earmark-text me-2"></i>Documentación y vencimientos
          </h5>
          <Button
            variant="success"
            size="sm"
            onClick={() => abrirFormulario()}
            className="d-flex align-items-center gap-1"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Agregar documento</span>
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          {error && !mostrarFormulario && (
            <div className="p-3 pb-0"><ErrorAlert mensaje={error} /></div>
          )}
          {cargando ? (
            <p className="text-muted text-center my-4">Cargando documentos...</p>
          ) : (
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Fecha de vencimiento</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-muted">
                      No hay documentos cargados para esta persona.
                    </td>
                  </tr>
                ) : (
                  documentos.map((documento) => (
                    <tr key={documento.id}>
                      <td><strong>{documento.nombre}</strong></td>
                      <td><Badge bg="info" className="text-dark">{nombreTipoDocumento(documento.tipo_documento)}</Badge></td>
                      <td>{formatearFecha(documento.fecha_vencimiento)}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <Button
                            variant="warning"
                            size="sm"
                            title="Editar o renovar"
                            aria-label={`Editar o renovar ${documento.nombre}`}
                            onClick={() => abrirFormulario(documento)}
                          >
                            <i className="bi bi-pencil-fill"></i>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            title="Eliminar"
                            aria-label={`Eliminar ${documento.nombre}`}
                            onClick={() => void handleEliminar(documento)}
                          >
                            <i className="bi bi-trash3-fill"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={mostrarFormulario} onHide={cerrarFormulario} centered>
        <Form noValidate validated={validado} onSubmit={handleGuardar}>
          <Modal.Header closeButton>
            <Modal.Title>
              {documentoEditando ? 'Editar o renovar documento' : 'Agregar documento'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <ErrorAlert mensaje={error} />}
            <Form.Group className="mb-3">
              <Form.Label>Nombre del documento</Form.Label>
              <Form.Control
                type="text"
                required
                maxLength={100}
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                Ingresá el nombre del documento.
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tipo de documento</Form.Label>
              <Form.Select
                required
                value={tipoDocumento}
                onChange={(evento) => setTipoDocumento(evento.target.value as TipoDocumento)}
              >
                {TIPOS_DOCUMENTO.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Fecha de vencimiento</Form.Label>
              <Form.Control
                type="date"
                required
                value={fechaVencimiento}
                onChange={(evento) => setFechaVencimiento(evento.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                Ingresá una fecha de vencimiento válida.
              </Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={cerrarFormulario} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : documentoEditando ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
